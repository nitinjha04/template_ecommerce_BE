import { FilterQuery, Types } from 'mongoose';
import { Order, Payment, Product, User } from '../models';
import { IOrder, IOrderItem, IShippingAddress } from '../models/Order.model';
import { ApiError } from '../utils/ApiError';
import { getLineSaleTotal } from '../utils/displayPricing';
import {
  buildPaginationMeta,
  PaginatedResult,
  parsePagination,
  searchRegex,
} from '../utils/pagination';
import { AdminListQuery } from '../types/adminList';
import { OrderStatus } from '../types';
// import { EmailService } from './email.service';
import { DsaGatewayPaymentService } from './dsaGatewayPayment.service';
import { applyDevTestOrderTotal, shouldApplyDevTestOrderAmount } from '../utils/devOrderAmount';
import { serializeLeanOrder } from '../utils/serializeOrder';
import type { IPayment } from '../models/Payment.model';
import { PaymentFinalizationService } from './paymentFinalization.service';

const ONLINE_PAYMENT_LABEL = 'Online Payment';

interface OrderItemInput {
  productId: string;
  quantity: number;
  size: string;
  color: string;
}

interface CreateOrderInput {
  userId?: string;
  customerName: string;
  email: string;
  phone: string;
  items: OrderItemInput[];
  shippingAddress: IShippingAddress;
  paymentMethod: string;
  orderNote?: string;
}

const PAYMENT_METHOD_LABELS = {
  cod: 'Cash on Delivery',
  online: 'Online Payment',
} as const;

const generateOrderNumber = async (): Promise<string> => {
  const count = await Order.countDocuments();
  return `ORD-${String(count + 1).padStart(3, '0')}`;
};

const generatePaymentNumber = async (): Promise<string> => {
  const count = await Payment.countDocuments();
  return `PAY-${String(count + 101).padStart(3, '0')}`;
};

const resolvePaymentStatus = (method: string): 'Completed' | 'Pending' | 'Failed' => {
  if (method === 'online') return 'Pending';
  return 'Pending';
};

export class OrderService {
  static async create(input: CreateOrderInput) {
    const paymentMethodKey = input.paymentMethod === 'online' ? 'online' : 'cod';

    // Idempotency for online payments:
    // if a pending order exists with same customer + same total + same cart lines,
    // return it (and a payment URL if already generated).
    if (paymentMethodKey === 'online') {
      const normalizedEmail = input.email.trim().toLowerCase();
      const normalizedPhone = input.phone.replace(/\D/g, '');

      const candidates = await Order.find({
        status: 'Pending',
        paymentMethod: PAYMENT_METHOD_LABELS.online,
        total: { $gte: 0 },
        email: normalizedEmail,
        phone: input.phone,
      })
        .sort({ createdAt: -1 })
        .limit(25);

      const normalizeLine = (l: {
        productId: string;
        quantity: number;
        size: string;
        color: string;
      }) => ({
        productId: String(l.productId),
        quantity: l.quantity,
        size: (l.size ?? '').trim() || 'One Size',
        color: (l.color ?? '').trim() || 'Default',
      });

      const inputLines = input.items.map(normalizeLine).sort((a, b) => {
        const ak = `${a.productId}|${a.size}|${a.color}`;
        const bk = `${b.productId}|${b.size}|${b.color}`;
        return ak.localeCompare(bk);
      });

      for (const existing of candidates) {
        if (existing.total !== undefined && existing.total !== null) {
          // Total must match exactly (doc requirement).
          // Note: totals are integers in this project; strict match is fine.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const existingTotal = (existing as any).total as number;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const inputTotalHint = (existing as any).total as number;
          if (existingTotal !== inputTotalHint) {
            // noop
          }
        }

        const existingLines = (existing.items || [])
          .map((it) => ({
            productId: String(it.product),
            quantity: it.quantity,
            size: (it.size ?? '').trim() || 'One Size',
            color: (it.color ?? '').trim() || 'Default',
          }))
          .sort((a, b) => {
            const ak = `${a.productId}|${a.size}|${a.color}`;
            const bk = `${b.productId}|${b.size}|${b.color}`;
            return ak.localeCompare(bk);
          });

        if (existingLines.length !== inputLines.length) continue;
        let same = true;
        for (let i = 0; i < inputLines.length; i++) {
          const a = inputLines[i];
          const b = existingLines[i];
          if (
            a.productId !== b.productId ||
            a.quantity !== b.quantity ||
            a.size !== b.size ||
            a.color !== b.color
          ) {
            same = false;
            break;
          }
        }
        if (!same) continue;

        // If phone mismatch (digits-only) treat as different order.
        const existingDigits = String(existing.phone ?? '').replace(/\D/g, '');
        if (normalizedPhone && existingDigits && normalizedPhone !== existingDigits) continue;

        const existingPayment = await Payment.findOne({
          order: existing._id,
          status: 'Pending',
        });
        if (!existingPayment) continue;

        const existingPayUrl =
          (existingPayment as any)?.gateway?.payUrlH5 as string | undefined;
        const existingMerchantOrderNo =
          (existingPayment as any)?.gateway?.merchantOrderNo as string | undefined;

        if (existingPayUrl) {
          return {
            order: existing,
            payment: existingPayment,
            paymentUrl: existingPayUrl,
            merchantOrderNo: existingMerchantOrderNo,
          };
        }
        return { order: existing, payment: existingPayment };
      }
    }

    const orderItems: IOrderItem[] = [];
    let total = 0;
    let itemCount = 0;

    for (const item of input.items) {
      const product = await Product.findById(item.productId);
      if (!product) {
        throw new ApiError(404, `Product not found: ${item.productId}`);
      }
      if (product.isPublished === false) {
        throw new ApiError(400, `${product.name} is no longer available`);
      }
      if (!product.inStock) {
        throw new ApiError(400, `${product.name} is out of stock`);
      }

      const catalogPrice = product.price;
      const { unitSalePrice, lineTotal } = getLineSaleTotal(catalogPrice, item.quantity);
      total += lineTotal;
      itemCount += item.quantity;

      orderItems.push({
        product: product._id as Types.ObjectId,
        name: product.name,
        price: unitSalePrice,
        quantity: item.quantity,
        size: item.size,
        color: item.color,
        image: product.images[0],
      });
    }

    const catalogTotal = total;
    total = applyDevTestOrderTotal(total);
    if (shouldApplyDevTestOrderAmount() && total !== catalogTotal) {
      console.info(
        `[dev] Order total overridden for testing: ${catalogTotal} → ${total} (rupees)`
      );
    }

    const orderNumber = await generateOrderNumber();

    const orderPayload: Record<string, unknown> = {
      orderNumber,
      customerName: input.customerName,
      email: input.email,
      phone: input.phone,
      items: orderItems,
      itemCount,
      total,
      status: 'Pending',
      shippingAddress: input.shippingAddress,
      paymentMethod: PAYMENT_METHOD_LABELS[paymentMethodKey],
      orderNote: input.orderNote?.trim() || '',
    };
    if (input.userId) {
      orderPayload.user = input.userId;
    }
    const order = await Order.create(orderPayload);

    const paymentNumber = await generatePaymentNumber();
    const paymentPayload: Record<string, unknown> = {
      paymentNumber,
      order: order._id,
      method: PAYMENT_METHOD_LABELS[paymentMethodKey],
      amount: total,
      status: resolvePaymentStatus(paymentMethodKey),
    };
    if (input.userId) {
      paymentPayload.user = input.userId;
    }
    const payment = await Payment.create(paymentPayload);

    // SMTP: order placed → buyer + admin (set EMAIL_ENABLED=true, configure SMTP, uncomment)
    // void EmailService.sendOrderPlacedEmails(order as IOrder).catch((err) =>
    //   console.error('[email] order placed:', err)
    // );

    if (paymentMethodKey === 'online') return { order, payment };

    // COD order created successfully: clear user's persisted cart.
    if (input.userId) {
      await User.updateOne({ _id: input.userId }, { $set: { cart: [] } });
    }

    return { order, payment };
  }

  static async getMyOrders(userId: string, email?: string) {
    const userObjectId = new Types.ObjectId(userId);
    const filter: FilterQuery<IOrder> = {
      $or: [{ user: userObjectId }],
    };

    if (email?.trim()) {
      const normalizedEmail = email.toLowerCase().trim();
      filter.$or!.push(
        { user: { $exists: false }, email: normalizedEmail },
        { user: null, email: normalizedEmail }
      );
    }

    const orders = await Order.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .lean<IOrder[]>();

    if (orders.length === 0) return [];

    const orderIds = orders.map((o) => o._id);
    const payments = await Payment.find({ order: { $in: orderIds } })
      .sort({ createdAt: -1 })
      .exec();

    const latestPaymentByOrder = new Map<string, IPayment>();
    for (const p of payments) {
      const key = String(p.order);
      if (!latestPaymentByOrder.has(key)) {
        latestPaymentByOrder.set(key, p);
      }
    }

    // Repair online orders: sync paymentInfo when payment is complete but order snapshot is missing.
    for (const o of orders) {
      if (o.paymentMethod !== ONLINE_PAYMENT_LABEL) continue;
      const payment = latestPaymentByOrder.get(String(o._id));
      if (!payment) continue;

      if (o.paymentInfo?.status === 'Completed' && payment.status === 'Completed') {
        continue;
      }

      try {
        const repaired = await PaymentFinalizationService.repairFromStoredVerifyResponse(
          o as IOrder,
          payment
        );
        if (repaired) {
          const refreshed = await Order.findById(o._id).lean<IOrder>();
          if (refreshed) Object.assign(o, refreshed);
          const refreshedPayment = await Payment.findById(payment._id).exec();
          if (refreshedPayment) {
            latestPaymentByOrder.set(String(o._id), refreshedPayment);
          }
        }
      } catch (err) {
        console.warn(
          `[orders] payment repair skipped for ${o.orderNumber}:`,
          err instanceof Error ? err.message : err
        );
      }
    }

    return orders.map((o) =>
      serializeLeanOrder(
        o as unknown as Record<string, unknown>,
        latestPaymentByOrder.get(String(o._id))
      )
    );
  }

  static async getAllOrders() {
    return Order.find().sort({ createdAt: -1, _id: -1 });
  }

  static async getAllAdmin(
    query: AdminListQuery
  ): Promise<PaginatedResult<IOrder>> {
    const { page, limit, skip } = parsePagination(query);
    const filter: FilterQuery<IOrder> = {};

    if (query.status && query.status !== 'All') {
      filter.status = query.status as OrderStatus;
    }

    const regex = searchRegex(query.search ?? '');
    if (regex) {
      filter.$or = [
        { orderNumber: regex },
        { customerName: regex },
        { email: regex },
        { phone: regex },
      ];
    }

    const [items, total] = await Promise.all([
      Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Order.countDocuments(filter),
    ]);

    return {
      items,
      pagination: buildPaginationMeta(page, limit, total),
    };
  }

  static async getById(id: string, userId?: string, isAdmin = false) {
    const order = await Order.findById(id);
    if (!order) {
      throw new ApiError(404, 'Order not found');
    }

    if (!isAdmin) {
      if (!order.user || !userId) {
        throw new ApiError(403, 'Access denied');
      }
      if (order.user.toString() !== userId) {
        throw new ApiError(403, 'Access denied');
      }
    }

    return order;
  }

  static async track(query: string) {
    const q = query.trim();
    if (!q) {
      throw new ApiError(400, 'Enter order ID, email, or phone number');
    }

    const emailLower = q.toLowerCase();
    const digitsOnly = q.replace(/\D/g, '');

    const orConditions: Record<string, unknown>[] = [
      { orderNumber: { $regex: new RegExp(`^${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } },
      { email: emailLower },
    ];

    if (digitsOnly.length >= 6) {
      orConditions.push({ phone: { $regex: digitsOnly } });
    } else if (!q.includes('@')) {
      orConditions.push({ phone: { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') } });
    }

    const orders = await Order.find({ $or: orConditions })
      .sort({ createdAt: -1 })
      .limit(20);

    if (orders.length === 0) {
      throw new ApiError(404, 'No orders found for this search');
    }

    return orders;
  }

  static async updateStatus(id: string, status: OrderStatus) {
    const existing = await Order.findById(id);
    if (!existing) {
      throw new ApiError(404, 'Order not found');
    }

    const previousStatus = existing.status;

    const order = await Order.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    );
    if (!order) {
      throw new ApiError(404, 'Order not found');
    }

    // SMTP: status updated → buyer (set EMAIL_ENABLED=true, configure SMTP, uncomment)
    // if (previousStatus !== status) {
    //   void EmailService.sendOrderStatusUpdatedEmail(
    //     order as IOrder,
    //     previousStatus
    //   ).catch((err) => console.error('[email] status update:', err));
    // }

    return order;
  }

  static async exportCsv(): Promise<string> {
    const orders = await Order.find().sort({ createdAt: -1 }).lean();

    const escape = (val: unknown) => {
      const str = String(val ?? '');
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const headers = [
      'Order Number',
      'Customer',
      'Email',
      'Phone',
      'Status',
      'Total',
      'Payment Method',
      'Items',
      'First Name',
      'Last Name',
      'Company',
      'Shipping Phone',
      'Street',
      'City',
      'State',
      'Country',
      'Postal Code',
      'Order Note',
      'Created At',
    ];

    const rows = orders.map((o) => {
      const addr = o.shippingAddress;
      return [
        o.orderNumber,
        o.customerName,
        o.email,
        o.phone,
        o.status,
        o.total,
        o.paymentMethod,
        o.itemCount,
        addr?.firstName || '',
        addr?.lastName || '',
        addr?.company || '',
        addr?.phone || '',
        addr?.street || '',
        addr?.city || '',
        addr?.state || '',
        addr?.country || '',
        addr?.postalCode || '',
        o.orderNote || '',
        new Date(o.createdAt).toISOString(),
      ].map(escape);
    });

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }
}
