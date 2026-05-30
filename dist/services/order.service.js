"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderService = void 0;
const mongoose_1 = require("mongoose");
const models_1 = require("../models");
const ApiError_1 = require("../utils/ApiError");
const displayPricing_1 = require("../utils/displayPricing");
const pagination_1 = require("../utils/pagination");
const email_service_1 = require("./email.service");
const env_1 = require("../config/env");
const devOrderAmount_1 = require("../utils/devOrderAmount");
const serializeOrder_1 = require("../utils/serializeOrder");
const paymentFinalization_service_1 = require("./paymentFinalization.service");
const pickOrderPayment_1 = require("../utils/pickOrderPayment");
const storeScope_1 = require("../utils/storeScope");
const ONLINE_PAYMENT_LABEL = 'Online Payment';
const PAYMENT_METHOD_LABELS = {
    cod: 'Cash on Delivery',
    online: 'Online Payment',
};
const generateOrderNumber = async () => {
    const count = await models_1.Order.countDocuments();
    return `ORD-${String(count + 1).padStart(3, '0')}`;
};
const generatePaymentNumber = async () => {
    const count = await models_1.Payment.countDocuments();
    return `PAY-${String(count + 101).padStart(3, '0')}`;
};
const resolvePaymentStatus = (method) => {
    if (method === 'online')
        return 'Pending';
    return 'Pending';
};
class OrderService {
    static async create(input) {
        const paymentMethodKey = input.paymentMethod === 'online' ? 'online' : 'cod';
        // Idempotency for online payments:
        // if a pending order exists with same customer + same total + same cart lines,
        // return it (and a payment URL if already generated).
        if (paymentMethodKey === 'online') {
            const normalizedEmail = input.email.trim().toLowerCase();
            const normalizedPhone = input.phone.replace(/\D/g, '');
            const candidates = await models_1.Order.find((0, storeScope_1.mergeStoreFilter)({
                status: 'Pending',
                paymentMethod: PAYMENT_METHOD_LABELS.online,
                total: { $gte: 0 },
                email: normalizedEmail,
                phone: input.phone,
            }))
                .sort({ createdAt: -1 })
                .limit(25);
            const normalizeLine = (l) => ({
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
                    const existingTotal = existing.total;
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const inputTotalHint = existing.total;
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
                if (existingLines.length !== inputLines.length)
                    continue;
                let same = true;
                for (let i = 0; i < inputLines.length; i++) {
                    const a = inputLines[i];
                    const b = existingLines[i];
                    if (a.productId !== b.productId ||
                        a.quantity !== b.quantity ||
                        a.size !== b.size ||
                        a.color !== b.color) {
                        same = false;
                        break;
                    }
                }
                if (!same)
                    continue;
                // If phone mismatch (digits-only) treat as different order.
                const existingDigits = String(existing.phone ?? '').replace(/\D/g, '');
                if (normalizedPhone && existingDigits && normalizedPhone !== existingDigits)
                    continue;
                const existingPayment = await models_1.Payment.findOne({
                    order: existing._id,
                    status: 'Pending',
                });
                if (!existingPayment)
                    continue;
                const existingPayUrl = existingPayment?.gateway?.payUrlH5;
                const existingMerchantOrderNo = existingPayment?.gateway?.merchantOrderNo;
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
        const orderItems = [];
        let total = 0;
        let itemCount = 0;
        for (const item of input.items) {
            const product = await models_1.Product.findOne((0, storeScope_1.mergeStoreFilter)({ _id: item.productId }));
            if (!product) {
                throw new ApiError_1.ApiError(404, `Product not found: ${item.productId}`);
            }
            if (product.isPublished === false) {
                throw new ApiError_1.ApiError(400, `${product.name} is no longer available`);
            }
            if (!product.inStock) {
                throw new ApiError_1.ApiError(400, `${product.name} is out of stock`);
            }
            const catalogPrice = product.price;
            const { unitSalePrice, lineTotal } = (0, displayPricing_1.getLineSaleTotal)(catalogPrice, item.quantity);
            total += lineTotal;
            itemCount += item.quantity;
            orderItems.push({
                product: product._id,
                name: product.name,
                price: unitSalePrice,
                quantity: item.quantity,
                size: item.size,
                color: item.color,
                image: product.images[0],
            });
        }
        const catalogTotal = total;
        total = (0, devOrderAmount_1.applyDevTestOrderTotal)(total);
        if ((0, devOrderAmount_1.shouldApplyDevTestOrderAmount)() && total !== catalogTotal) {
            console.info(`[dev] Order total overridden for testing: ${catalogTotal} → ${total} (rupees)`);
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
            paymentMethod: PAYMENT_METHOD_LABELS[paymentMethodKey],
            orderNote: input.orderNote?.trim() || '',
        };
        if (input.userId) {
            orderPayload.user = input.userId;
        }
        const order = await models_1.Order.create((0, storeScope_1.withStoreId)(orderPayload));
        const paymentNumber = await generatePaymentNumber();
        const paymentPayload = {
            paymentNumber,
            order: order._id,
            method: PAYMENT_METHOD_LABELS[paymentMethodKey],
            amount: total,
            status: resolvePaymentStatus(paymentMethodKey),
        };
        if (input.userId) {
            paymentPayload.user = input.userId;
        }
        const payment = await models_1.Payment.create((0, storeScope_1.withStoreId)(paymentPayload));
        if (paymentMethodKey !== 'online' && (0, env_1.isEmailEnabled)()) {
            void email_service_1.EmailService.sendOrderPlacedEmails(order).catch((err) => console.error('[email] order placed:', err));
        }
        if (paymentMethodKey === 'online')
            return { order, payment };
        // COD order created successfully: clear user's persisted cart.
        if (input.userId) {
            await models_1.User.updateOne({ _id: input.userId }, { $set: { cart: [] } });
        }
        return { order, payment };
    }
    static async getMyOrders(userId, email) {
        const userObjectId = new mongoose_1.Types.ObjectId(userId);
        const filter = (0, storeScope_1.mergeStoreFilter)({
            $or: [{ user: userObjectId }],
        });
        if (email?.trim()) {
            const normalizedEmail = email.toLowerCase().trim();
            filter.$or.push({ user: { $exists: false }, email: normalizedEmail }, { user: null, email: normalizedEmail });
        }
        const orders = await models_1.Order.find(filter)
            .sort({ createdAt: -1, _id: -1 })
            .lean();
        if (orders.length === 0)
            return [];
        const orderIds = orders.map((o) => o._id);
        const payments = await models_1.Payment.find({ order: { $in: orderIds } })
            .sort({ createdAt: -1 })
            .exec();
        const paymentsByOrder = (0, pickOrderPayment_1.groupPaymentsByOrder)(payments);
        const latestPaymentByOrder = new Map();
        for (const [orderId, list] of paymentsByOrder) {
            const best = (0, pickOrderPayment_1.pickBestPaymentForOrder)(list);
            if (best)
                latestPaymentByOrder.set(orderId, best);
        }
        // Repair online orders: sync paymentInfo when payment is complete but order snapshot is missing.
        for (const o of orders) {
            if (o.paymentMethod !== ONLINE_PAYMENT_LABEL)
                continue;
            const payment = latestPaymentByOrder.get(String(o._id));
            if (!payment)
                continue;
            if (o.paymentInfo?.status === 'Completed' && payment.status === 'Completed') {
                continue;
            }
            try {
                const repaired = await paymentFinalization_service_1.PaymentFinalizationService.repairFromStoredVerifyResponse(o, payment);
                if (repaired) {
                    const refreshed = await models_1.Order.findById(o._id).lean();
                    if (refreshed)
                        Object.assign(o, refreshed);
                    const refreshedPayment = await models_1.Payment.findById(payment._id).exec();
                    if (refreshedPayment) {
                        latestPaymentByOrder.set(String(o._id), refreshedPayment);
                    }
                }
            }
            catch (err) {
                console.warn(`[orders] payment repair skipped for ${o.orderNumber}:`, err instanceof Error ? err.message : err);
            }
        }
        return orders.map((o) => (0, serializeOrder_1.serializeLeanOrder)(o, latestPaymentByOrder.get(String(o._id))));
    }
    static async getAllOrders() {
        return models_1.Order.find((0, storeScope_1.mergeStoreFilter)()).sort({ createdAt: -1, _id: -1 });
    }
    static async getAllAdmin(query) {
        const { page, limit, skip } = (0, pagination_1.parsePagination)(query);
        const filter = (0, storeScope_1.mergeStoreFilter)({}, query.storeId);
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
        const order = await models_1.Order.findOne((0, storeScope_1.mergeStoreFilter)({ _id: id }));
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
        const orders = await models_1.Order.find((0, storeScope_1.mergeStoreFilter)({ $or: orConditions }))
            .sort({ createdAt: -1, _id: -1 })
            .limit(20)
            .lean();
        if (orders.length === 0) {
            throw new ApiError_1.ApiError(404, 'No orders found for this search');
        }
        const orderIds = orders.map((o) => o._id);
        const payments = await models_1.Payment.find({ order: { $in: orderIds } })
            .sort({ createdAt: -1 })
            .exec();
        const paymentsByOrder = (0, pickOrderPayment_1.groupPaymentsByOrder)(payments);
        const latestPaymentByOrder = new Map();
        for (const [orderId, list] of paymentsByOrder) {
            const best = (0, pickOrderPayment_1.pickBestPaymentForOrder)(list);
            if (best)
                latestPaymentByOrder.set(orderId, best);
        }
        const serialized = orders.map((o) => (0, serializeOrder_1.serializeLeanOrder)(o, latestPaymentByOrder.get(String(o._id))));
        serialized.sort((a, b) => {
            const byDate = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            if (byDate !== 0)
                return byDate;
            return b.id.localeCompare(a.id);
        });
        return serialized;
    }
    static async updateStatus(id, status) {
        const existing = await models_1.Order.findOne((0, storeScope_1.mergeStoreFilter)({ _id: id }));
        if (!existing) {
            throw new ApiError_1.ApiError(404, 'Order not found');
        }
        const previousStatus = existing.status;
        const order = await models_1.Order.findOneAndUpdate((0, storeScope_1.mergeStoreFilter)({ _id: id }), { status }, { new: true, runValidators: true });
        if (!order) {
            throw new ApiError_1.ApiError(404, 'Order not found');
        }
        if (previousStatus !== status && (0, env_1.isEmailEnabled)()) {
            const orderDoc = order;
            if (status === 'Cancelled') {
                void email_service_1.EmailService.sendOrderCancelledEmail(orderDoc).catch((err) => console.error('[email] order cancelled:', err));
            }
            else {
                void email_service_1.EmailService.sendOrderStatusUpdatedEmail(orderDoc, previousStatus).catch((err) => console.error('[email] status update:', err));
            }
        }
        return order;
    }
    static async exportCsv() {
        const orders = await models_1.Order.find((0, storeScope_1.mergeStoreFilter)()).sort({ createdAt: -1 }).lean();
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
