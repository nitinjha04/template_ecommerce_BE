"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RazorpayPaymentService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const razorpay_1 = __importDefault(require("razorpay"));
const env_1 = require("../config/env");
const models_1 = require("../models");
const ApiError_1 = require("../utils/ApiError");
const devOrderAmount_1 = require("../utils/devOrderAmount");
const storeScope_1 = require("../utils/storeScope");
const paymentFinalization_service_1 = require("./paymentFinalization.service");
const paymentSideEffects_1 = require("./paymentSideEffects");
class RazorpayPaymentService {
    static client = null;
    static log(step, details) {
        if (details) {
            console.info(`[razorpay] ${step}`, details);
            return;
        }
        console.info(`[razorpay] ${step}`);
    }
    static getClient() {
        if (!(0, env_1.isRazorpayConfigured)()) {
            throw new ApiError_1.ApiError(500, 'Razorpay is not configured');
        }
        if (!this.client) {
            this.client = new razorpay_1.default({
                key_id: env_1.env.razorpay.keyId,
                key_secret: env_1.env.razorpay.keySecret,
            });
        }
        return this.client;
    }
    static verifyCheckoutSignature(orderId, paymentId, signature) {
        const body = `${orderId}|${paymentId}`;
        const expected = crypto_1.default
            .createHmac('sha256', env_1.env.razorpay.keySecret)
            .update(body)
            .digest('hex');
        try {
            return crypto_1.default.timingSafeEqual(Buffer.from(expected), Buffer.from(String(signature)));
        }
        catch {
            return false;
        }
    }
    static verifyWebhookSignature(rawBody, signature) {
        const secret = env_1.env.razorpay.webhookSecret;
        if (!secret)
            return false;
        const expected = crypto_1.default
            .createHmac('sha256', secret)
            .update(rawBody)
            .digest('hex');
        try {
            return crypto_1.default.timingSafeEqual(Buffer.from(expected), Buffer.from(String(signature)));
        }
        catch {
            return false;
        }
    }
    static async assertOrderAccess(orderNumber, email, phone, scoped = true) {
        const filter = scoped
            ? (0, storeScope_1.mergeStoreFilter)({ orderNumber: orderNumber.trim() })
            : { orderNumber: orderNumber.trim() };
        const order = await models_1.Order.findOne(filter);
        if (!order)
            throw new ApiError_1.ApiError(404, 'Order not found');
        if (email && order.email !== email.trim().toLowerCase()) {
            throw new ApiError_1.ApiError(403, 'Order email does not match');
        }
        if (phone) {
            const digits = phone.replace(/\D/g, '');
            const orderDigits = String(order.phone ?? '').replace(/\D/g, '');
            if (digits && orderDigits && digits !== orderDigits) {
                throw new ApiError_1.ApiError(403, 'Order phone does not match');
            }
        }
        const payment = await models_1.Payment.findOne({ order: order._id });
        if (!payment)
            throw new ApiError_1.ApiError(404, 'Payment record not found for order');
        return { order, payment };
    }
    static async createForOrder(input) {
        if (!(0, env_1.isRazorpayConfigured)()) {
            throw new ApiError_1.ApiError(500, 'Razorpay is not configured');
        }
        this.log('createForOrder:start', { orderNumber: input.orderNumber });
        const { order, payment } = await this.assertOrderAccess(input.orderNumber, input.email, input.phone);
        if (payment.status === 'Completed') {
            throw new ApiError_1.ApiError(400, 'Order is already paid');
        }
        // Charge override (₹1 default): development, or DEV_TEST_ORDER_AMOUNT / DEV_FORCE_ORDER_AMOUNT set.
        // Amount sent to Razorpay can be ₹1 while order.total stays the real cart total.
        const orderTotal = Number(order.total) || 0;
        const chargeTotal = (0, devOrderAmount_1.applyDevTestOrderTotal)(orderTotal);
        const amountPaise = Math.max(100, Math.round(chargeTotal * 100)); // Razorpay min = 100 paise
        const isDevCharge = (0, devOrderAmount_1.shouldApplyDevTestOrderAmount)();
        this.log('createForOrder:amount', {
            orderNumber: order.orderNumber,
            orderTotal,
            chargeTotal,
            amountPaise,
            nodeEnv: env_1.env.nodeEnv,
            devTestCharge: isDevCharge,
        });
        const receipt = order.orderNumber.slice(0, 40);
        const rzpOrder = await this.getClient().orders.create({
            amount: amountPaise,
            currency: 'INR',
            receipt,
            notes: {
                orderNumber: order.orderNumber,
                storeOrderId: String(order._id),
                ...(isDevCharge
                    ? {
                        devTestCharge: 'true',
                        originalOrderTotal: String(orderTotal),
                    }
                    : {}),
            },
        });
        await models_1.Payment.updateOne({ _id: payment._id }, {
            $set: {
                provider: 'razorpay',
                method: 'Razorpay',
                status: 'Pending',
                razorpay: {
                    orderId: rzpOrder.id,
                    amount: amountPaise,
                    currency: 'INR',
                    createResponse: rzpOrder,
                },
            },
        });
        this.log('createForOrder:created', {
            orderNumber: order.orderNumber,
            razorpayOrderId: rzpOrder.id,
            amountPaise,
        });
        return {
            keyId: env_1.env.razorpay.keyId,
            razorpayOrderId: rzpOrder.id,
            amount: amountPaise,
            currency: 'INR',
            orderNumber: order.orderNumber,
            name: input.name?.trim() || undefined,
            email: input.email?.trim().toLowerCase() || order.email,
            phone: input.phone?.trim() || order.phone,
        };
    }
    static async finalizePaid(input) {
        const { order, payment } = input;
        const paidAt = payment.paidAt ?? new Date();
        if (payment.status === 'Completed') {
            await paymentFinalization_service_1.PaymentFinalizationService.ensureOrderPaymentSnapshot(order._id, payment, { paidAt, gatewayOrderNo: input.razorpayPaymentId });
            return;
        }
        await models_1.Payment.updateOne({ _id: payment._id }, {
            $set: {
                status: 'Completed',
                paidAt,
                provider: 'razorpay',
                method: 'Razorpay',
                'razorpay.orderId': input.razorpayOrderId,
                'razorpay.paymentId': input.razorpayPaymentId,
                ...(input.signature
                    ? { 'razorpay.signature': input.signature }
                    : {}),
                ...(input.webhookData
                    ? { 'razorpay.webhookData': input.webhookData }
                    : {}),
            },
        });
        const freshPayment = await models_1.Payment.findById(payment._id);
        if (!freshPayment)
            return;
        await paymentFinalization_service_1.PaymentFinalizationService.ensureOrderPaymentSnapshot(order._id, freshPayment, { paidAt, gatewayOrderNo: input.razorpayPaymentId });
        if (order.status === 'Pending') {
            await models_1.Order.updateOne({ _id: order._id }, { $set: { status: 'Processing' } });
        }
        (0, paymentSideEffects_1.runPaymentSuccessSideEffects)({
            paymentId: freshPayment._id,
            orderId: order._id,
            userId: order.user,
        });
    }
    static async verifyAndCapture(input) {
        if (!(0, env_1.isRazorpayConfigured)()) {
            throw new ApiError_1.ApiError(500, 'Razorpay is not configured');
        }
        const valid = this.verifyCheckoutSignature(input.razorpay_order_id, input.razorpay_payment_id, input.razorpay_signature);
        if (!valid) {
            throw new ApiError_1.ApiError(400, 'Invalid Razorpay payment signature');
        }
        const { order, payment } = await this.assertOrderAccess(input.orderNumber, input.email, input.phone);
        if (payment.razorpay?.orderId &&
            payment.razorpay.orderId !== input.razorpay_order_id) {
            throw new ApiError_1.ApiError(400, 'Razorpay order does not match this store order');
        }
        await this.finalizePaid({
            order,
            payment,
            razorpayOrderId: input.razorpay_order_id,
            razorpayPaymentId: input.razorpay_payment_id,
            signature: input.razorpay_signature,
        });
        this.log('verifyAndCapture:ok', {
            orderNumber: order.orderNumber,
            paymentId: input.razorpay_payment_id,
        });
        return {
            orderNumber: order.orderNumber,
            paymentId: input.razorpay_payment_id,
            status: 'Completed',
        };
    }
    static async handleWebhook(rawBody, signature, event) {
        if (!(0, env_1.isRazorpayConfigured)()) {
            this.log('webhook:skipped_not_configured');
            return;
        }
        if (!env_1.env.razorpay.webhookSecret) {
            this.log('webhook:skipped_no_webhook_secret');
            return;
        }
        if (!signature || !this.verifyWebhookSignature(rawBody, signature)) {
            throw new ApiError_1.ApiError(400, 'Invalid Razorpay webhook signature');
        }
        const eventName = event.event ?? '';
        if (eventName !== 'payment.captured' && eventName !== 'payment.authorized') {
            this.log('webhook:ignored_event', { eventName });
            return;
        }
        const entity = event.payload?.payment?.entity;
        const razorpayPaymentId = entity?.id;
        const razorpayOrderId = entity?.order_id;
        if (!razorpayPaymentId || !razorpayOrderId) {
            this.log('webhook:missing_ids');
            return;
        }
        const payment = await models_1.Payment.findOne({ 'razorpay.orderId': razorpayOrderId });
        if (!payment) {
            this.log('webhook:payment_not_found', { razorpayOrderId });
            return;
        }
        const order = await models_1.Order.findById(payment.order);
        if (!order) {
            this.log('webhook:order_not_found', { razorpayOrderId });
            return;
        }
        await this.finalizePaid({
            order,
            payment,
            razorpayOrderId,
            razorpayPaymentId,
            webhookData: event,
        });
        this.log('webhook:finalized', {
            orderNumber: order.orderNumber,
            razorpayPaymentId,
            eventName,
        });
    }
}
exports.RazorpayPaymentService = RazorpayPaymentService;
