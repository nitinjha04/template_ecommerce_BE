import { Types } from 'mongoose';
import { Order, Payment, Product } from '../models';
import { IOrderItem, IShippingAddress } from '../models/Order.model';
import { ApiError } from '../utils/ApiError';
import { OrderStatus } from '../types';
// import { EmailService } from './email.service';

interface OrderItemInput {
  productId: string;
  quantity: number;
  size: string;
  color: string;
}

interface CreateOrderInput {
  userId: string;
  customerName: string;
  email: string;
  phone: string;
  items: OrderItemInput[];
  shippingAddress: IShippingAddress;
  paymentMethod: string;
  orderNote?: string;
}

const PAYMENT_METHOD_LABEL = 'Cash on Delivery';

const generateOrderNumber = async (): Promise<string> => {
  const count = await Order.countDocuments();
  return `ORD-${String(count + 1).padStart(3, '0')}`;
};

const generatePaymentNumber = async (): Promise<string> => {
  const count = await Payment.countDocuments();
  return `PAY-${String(count + 101).padStart(3, '0')}`;
};

const resolvePaymentStatus = (method: string): 'Completed' | 'Pending' | 'Failed' => {
  if (method === 'COD') return 'Pending';
  return 'Completed';
};

export class OrderService {
  static async create(input: CreateOrderInput) {
    const orderItems: IOrderItem[] = [];
    let total = 0;
    let itemCount = 0;

    for (const item of input.items) {
      const product = await Product.findById(item.productId);
      if (!product) {
        throw new ApiError(404, `Product not found: ${item.productId}`);
      }
      if (!product.inStock) {
        throw new ApiError(400, `${product.name} is out of stock`);
      }

      const lineTotal = product.price * item.quantity;
      total += lineTotal;
      itemCount += item.quantity;

      orderItems.push({
        product: product._id as Types.ObjectId,
        name: product.name,
        price: product.price,
        quantity: item.quantity,
        size: item.size,
        color: item.color,
        image: product.images[0],
      });
    }

    const orderNumber = await generateOrderNumber();

    const order = await Order.create({
      orderNumber,
      user: input.userId,
      customerName: input.customerName,
      email: input.email,
      phone: input.phone,
      items: orderItems,
      itemCount,
      total,
      status: 'Pending',
      shippingAddress: input.shippingAddress,
      paymentMethod: PAYMENT_METHOD_LABEL,
      orderNote: input.orderNote?.trim() || '',
    });

    const paymentNumber = await generatePaymentNumber();
    const payment = await Payment.create({
      paymentNumber,
      order: order._id,
      user: input.userId,
      method: PAYMENT_METHOD_LABEL,
      amount: total,
      status: resolvePaymentStatus('COD'),
    });

    // SMTP: order placed → buyer + admin (set EMAIL_ENABLED=true, configure SMTP, uncomment)
    // void EmailService.sendOrderPlacedEmails(order as IOrder).catch((err) =>
    //   console.error('[email] order placed:', err)
    // );

    return { order, payment };
  }

  static async getMyOrders(userId: string) {
    return Order.find({ user: userId }).sort({ createdAt: -1 });
  }

  static async getAllOrders() {
    return Order.find().sort({ createdAt: -1 });
  }

  static async getById(id: string, userId?: string, isAdmin = false) {
    const order = await Order.findById(id);
    if (!order) {
      throw new ApiError(404, 'Order not found');
    }

    if (!isAdmin && order.user.toString() !== userId) {
      throw new ApiError(403, 'Access denied');
    }

    return order;
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
