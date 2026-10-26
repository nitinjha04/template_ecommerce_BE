"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderService = void 0;
const models_1 = require("../models");
const ApiError_1 = require("../utils/ApiError");
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
        const order = await models_1.Order.create({
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
        const payment = await models_1.Payment.create({
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
    static async getMyOrders(userId) {
        return models_1.Order.find({ user: userId }).sort({ createdAt: -1 });
    }
    static async getAllOrders() {
        return models_1.Order.find().sort({ createdAt: -1 });
    }
    static async getById(id, userId, isAdmin = false) {
        const order = await models_1.Order.findById(id);
        if (!order) {
            throw new ApiError_1.ApiError(404, 'Order not found');
        }
        if (!isAdmin && order.user.toString() !== userId) {
            throw new ApiError_1.ApiError(403, 'Access denied');
        }
        return order;
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
}
exports.OrderService = OrderService;
//# sourceMappingURL=order.service.js.map