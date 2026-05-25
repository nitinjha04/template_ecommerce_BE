"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderService = void 0;
const models_1 = require("../models");
const ApiError_1 = require("../utils/ApiError");
const pagination_1 = require("../utils/pagination");
const PAYMENT_METHOD_LABEL = 'Cash on Delivery';
const generateOrderNumber = async () => {
    const count = await models_1.Order.countDocuments();
    return `ORD-${String(count + 1).padStart(3, '0')}`;
};
const generatePaymentNumber = async () => {
    const count = await models_1.Payment.countDocuments();
    return `PAY-${String(count + 101).padStart(3, '0')}`;
};
const resolvePaymentStatus = (method) => {
    if (method === 'COD')
        return 'Pending';
    return 'Completed';
};
class OrderService {
    static async create(input) {
        const orderItems = [];
        let total = 0;
        let itemCount = 0;
        for (const item of input.items) {
            const product = await models_1.Product.findById(item.productId);
            if (!product) {
                throw new ApiError_1.ApiError(404, `Product not found: ${item.productId}`);
            }
            if (product.isPublished === false) {
                throw new ApiError_1.ApiError(400, `${product.name} is no longer available`);
            }
            if (!product.inStock) {
                throw new ApiError_1.ApiError(400, `${product.name} is out of stock`);
            }
            const lineTotal = product.price * item.quantity;
            total += lineTotal;
            itemCount += item.quantity;
            orderItems.push({
                product: product._id,
                name: product.name,
                price: product.price,
                quantity: item.quantity,
                size: item.size,
                color: item.color,
                image: product.images[0],
            });
        }
        const orderNumber = await generateOrderNumber();
        const orderPayload = {
            orderNumber,
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
        };
        if (input.userId) {
            orderPayload.user = input.userId;
        }
        const order = await models_1.Order.create(orderPayload);
        const paymentNumber = await generatePaymentNumber();
        const paymentPayload = {
            paymentNumber,
            order: order._id,
            method: PAYMENT_METHOD_LABEL,
            amount: total,
            status: resolvePaymentStatus('COD'),
        };
        if (input.userId) {
            paymentPayload.user = input.userId;
        }
        const payment = await models_1.Payment.create(paymentPayload);
        // SMTP: order placed → buyer + admin (set EMAIL_ENABLED=true, configure SMTP, uncomment)
        // void EmailService.sendOrderPlacedEmails(order as IOrder).catch((err) =>
        //   console.error('[email] order placed:', err)
        // );
        return { order, payment };
    }
    static async getMyOrders(userId) {
        return models_1.Order.find({ user: userId }).sort({ createdAt: -1 });
    }
    static async getAllOrders() {
        return models_1.Order.find().sort({ createdAt: -1 });
    }
    static async getAllAdmin(query) {
        const { page, limit, skip } = (0, pagination_1.parsePagination)(query);
        const filter = {};
        if (query.status && query.status !== 'All') {
            filter.status = query.status;
        }
        const regex = (0, pagination_1.searchRegex)(query.search ?? '');
        if (regex) {
            filter.$or = [
                { orderNumber: regex },
                { customerName: regex },
                { email: regex },
                { phone: regex },
            ];
        }
        const [items, total] = await Promise.all([
            models_1.Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
            models_1.Order.countDocuments(filter),
        ]);
        return {
            items,
            pagination: (0, pagination_1.buildPaginationMeta)(page, limit, total),
        };
    }
    static async getById(id, userId, isAdmin = false) {
        const order = await models_1.Order.findById(id);
        if (!order) {
            throw new ApiError_1.ApiError(404, 'Order not found');
        }
        if (!isAdmin) {
            if (!order.user || !userId) {
                throw new ApiError_1.ApiError(403, 'Access denied');
            }
            if (order.user.toString() !== userId) {
                throw new ApiError_1.ApiError(403, 'Access denied');
            }
        }
        return order;
    }
    static async track(query) {
        const q = query.trim();
        if (!q) {
            throw new ApiError_1.ApiError(400, 'Enter order ID, email, or phone number');
        }
        const emailLower = q.toLowerCase();
        const digitsOnly = q.replace(/\D/g, '');
        const orConditions = [
            { orderNumber: { $regex: new RegExp(`^${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } },
            { email: emailLower },
        ];
        if (digitsOnly.length >= 6) {
            orConditions.push({ phone: { $regex: digitsOnly } });
        }
        else if (!q.includes('@')) {
            orConditions.push({ phone: { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') } });
        }
        const orders = await models_1.Order.find({ $or: orConditions })
            .sort({ createdAt: -1 })
            .limit(20);
        if (orders.length === 0) {
            throw new ApiError_1.ApiError(404, 'No orders found for this search');
        }
        return orders;
    }
    static async updateStatus(id, status) {
        const existing = await models_1.Order.findById(id);
        if (!existing) {
            throw new ApiError_1.ApiError(404, 'Order not found');
        }
        const previousStatus = existing.status;
        const order = await models_1.Order.findByIdAndUpdate(id, { status }, { new: true, runValidators: true });
        if (!order) {
            throw new ApiError_1.ApiError(404, 'Order not found');
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
    static async exportCsv() {
        const orders = await models_1.Order.find().sort({ createdAt: -1 }).lean();
        const escape = (val) => {
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
exports.OrderService = OrderService;
