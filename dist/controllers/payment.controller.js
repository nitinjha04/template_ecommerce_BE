"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentController = void 0;
const env_1 = require("../config/env");
const store_context_1 = require("../context/store.context");
const dsaGatewayPayment_service_1 = require("../services/dsaGatewayPayment.service");
const cashfreePayment_service_1 = require("../services/cashfreePayment.service");
const payuPayment_service_1 = require("../services/payuPayment.service");
const razorpayPayment_service_1 = require("../services/razorpayPayment.service");
const ApiError_1 = require("../utils/ApiError");
const models_1 = require("../models");
const storeScope_1 = require("../utils/storeScope");
const adminStoreQuery_1 = require("../utils/adminStoreQuery");
const payment_service_1 = require("../services/payment.service");
const asyncHandler_1 = require("../utils/asyncHandler");
const params_1 = require("../utils/params");
const ApiResponse_1 = require("../views/ApiResponse");
class PaymentController {
    static getAll = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
        const { page, limit, search, status } = req.query;
        const result = await payment_service_1.PaymentService.getAllAdmin({
            page: page ? Number(page) : undefined,
            limit: limit ? Number(limit) : undefined,
            search: search,
            status: status,
            storeId: (0, adminStoreQuery_1.pickStoreIdFromQuery)(req.query.storeId),
        });
        ApiResponse_1.ApiResponse.success(res, result.items, 'Payments fetched', 200, result.pagination);
    });
    static getMyPayments = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
        const payments = await payment_service_1.PaymentService.getMyPayments(req.user.userId);
        ApiResponse_1.ApiResponse.success(res, payments);
    });
    static getById = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
        const isAdmin = req.user.role === 'admin';
        const payment = await payment_service_1.PaymentService.getById((0, params_1.getParamId)(req), req.user.userId, isAdmin);
        ApiResponse_1.ApiResponse.success(res, payment);
    });
    static updateStatus = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
        const payment = await payment_service_1.PaymentService.updateStatus((0, params_1.getParamId)(req), req.body.status);
        ApiResponse_1.ApiResponse.success(res, payment, 'Payment status updated');
    });
    static createProviderPayment = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
        const { orderNumber, provider, gatewayId, email, phone, name, } = req.body;
        if (provider === 'cashfree') {
            const result = await cashfreePayment_service_1.CashfreePaymentService.createForOrder({
                orderNumber,
                email,
                phone,
                name,
            });
            ApiResponse_1.ApiResponse.success(res, result, 'Cashfree order created');
            return;
        }
        if (provider === 'payu') {
            const result = await payuPayment_service_1.PayuPaymentService.createForOrder({
                orderNumber,
                email,
                phone,
                name,
            });
            ApiResponse_1.ApiResponse.success(res, result, 'PayU checkout created');
            return;
        }
        if (provider === 'razorpay') {
            const result = await razorpayPayment_service_1.RazorpayPaymentService.createForOrder({
                orderNumber,
                email,
                phone,
                name,
            });
            ApiResponse_1.ApiResponse.success(res, result, 'Razorpay order created');
            return;
        }
        if (provider === 'dsa_deeplink') {
            const result = await dsaGatewayPayment_service_1.DsaGatewayPaymentService.createForOrder({
                orderNumber,
                gatewayId,
                email,
                phone,
                name,
            });
            ApiResponse_1.ApiResponse.success(res, result, 'Payment link created');
            return;
        }
        if (provider === 'direct_upi') {
            const vpa = env_1.env.directUpi.vpa;
            if (!vpa) {
                throw new ApiError_1.ApiError(500, 'Direct UPI is not configured');
            }
            const order = await models_1.Order.findOne((0, storeScope_1.mergeStoreFilter)({ orderNumber: orderNumber.trim() }));
            if (!order)
                throw new ApiError_1.ApiError(404, 'Order not found');
            // Optional guest safety check (match on email/phone if provided)
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
            if (payment.status === 'Completed') {
                throw new ApiError_1.ApiError(400, 'Order is already paid');
            }
            const amount = String(order.total);
            const tn = `Order ${order.orderNumber}`;
            const upiLink = `upi://pay?pa=${encodeURIComponent(vpa)}` +
                `&am=${encodeURIComponent(amount)}` +
                `&cu=INR` +
                `&tn=${encodeURIComponent(tn)}`;
            await models_1.Payment.updateOne({ _id: payment._id }, {
                $set: {
                    provider: 'direct_upi',
                    method: 'Direct UPI',
                    status: 'Pending',
                    directUpi: {
                        vpa,
                        upiLink,
                    },
                },
            });
            ApiResponse_1.ApiResponse.success(res, { upiLink, qrData: upiLink, vpa, amount: order.total, orderNumber: order.orderNumber }, 'UPI link created');
            return;
        }
        if (provider === 'phonepe') {
            throw new ApiError_1.ApiError(501, 'PhonePe integration is not configured yet. Please choose another method.');
        }
        throw new ApiError_1.ApiError(400, 'Invalid provider');
    });
    /** Public: which checkout providers are enabled on this API. */
    static getAvailableMethods = (0, asyncHandler_1.asyncHandler)(async (_req, res) => {
        const storeDomain = (0, store_context_1.getStoreContext)()?.storeDomain;
        const rzpCreds = (0, env_1.resolveRazorpayCredentials)(storeDomain);
        const cfCreds = (0, env_1.resolveCashfreeCredentials)(storeDomain);
        const payuCreds = (0, env_1.resolvePayuCredentials)(storeDomain);
        const razorpay = Boolean(rzpCreds) || (0, env_1.isRazorpayConfigured)();
        const cashfree = Boolean(cfCreds) || (0, env_1.isCashfreeConfigured)();
        const payu = Boolean(payuCreds) || (0, env_1.isPayuConfigured)();
        const keyId = rzpCreds?.keyId ?? ((0, env_1.isRazorpayConfigured)() ? env_1.env.razorpay.keyId : undefined);
        const appId = cfCreds?.appId ?? ((0, env_1.isCashfreeConfigured)() ? env_1.env.cashfree.appId : undefined);
        const payuKey = payuCreds?.key ?? ((0, env_1.isPayuConfigured)() ? env_1.env.payu.key : undefined);
        ApiResponse_1.ApiResponse.success(res, {
            razorpay,
            keyId: razorpay ? keyId : undefined,
            keyIdPrefix: keyId ? `${keyId.slice(0, 6)}…` : undefined,
            cashfree,
            appId: cashfree ? appId : undefined,
            appIdPrefix: appId ? `${appId.slice(0, 6)}…` : undefined,
            cashfreeEnv: cashfree ? (cfCreds?.env ?? env_1.env.cashfree.env) : undefined,
            payu,
            payuKey: payu ? payuKey : undefined,
            payuKeyPrefix: payuKey ? `${payuKey.slice(0, 6)}…` : undefined,
            payuEnv: payu ? (payuCreds?.env ?? env_1.env.payu.env) : undefined,
            storeDomain: storeDomain || undefined,
        }, 'Payment methods');
    });
    static verifyRazorpay = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
        const { orderNumber, razorpay_order_id, razorpay_payment_id, razorpay_signature, email, phone, } = req.body;
        const result = await razorpayPayment_service_1.RazorpayPaymentService.verifyAndCapture({
            orderNumber,
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            email,
            phone,
        });
        ApiResponse_1.ApiResponse.success(res, result, 'Payment verified');
    });
    static razorpayWebhook = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
        const signature = req.header('x-razorpay-signature') ?? undefined;
        const rawBody = req.rawBody ??
            Buffer.from(JSON.stringify(req.body ?? {}));
        await razorpayPayment_service_1.RazorpayPaymentService.handleWebhook(rawBody, signature, req.body);
        res.status(200).json({ status: 'ok' });
    });
    static verifyCashfree = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
        const { orderNumber, cashfree_order_id, email, phone } = req.body;
        const result = await cashfreePayment_service_1.CashfreePaymentService.verifyAndCapture({
            orderNumber,
            cashfree_order_id,
            email,
            phone,
        });
        ApiResponse_1.ApiResponse.success(res, result, 'Payment verified');
    });
    static cashfreeWebhook = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
        const signature = req.header('x-webhook-signature') ?? undefined;
        const timestamp = req.header('x-webhook-timestamp') ?? undefined;
        const rawBody = req.rawBody ??
            Buffer.from(JSON.stringify(req.body ?? {}));
        await cashfreePayment_service_1.CashfreePaymentService.handleWebhook(rawBody, signature, timestamp, req.body);
        res.status(200).json({ status: 'ok' });
    });
    /** PayU surl/furl — browser lands here after hosted checkout. Always redirect (never JSON). */
    static payuReturn = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
        const payload = {
            ...(typeof req.body === 'object' && req.body ? req.body : {}),
            ...(typeof req.query === 'object' && req.query ? req.query : {}),
        };
        try {
            const { redirectUrl } = await payuPayment_service_1.PayuPaymentService.handleReturn(payload);
            res.redirect(302, redirectUrl);
        }
        catch (err) {
            // Last resort: never leave the shopper on a JSON API error page.
            console.error('[payu] return handler failed', err);
            const order = String(payload.order ?? payload.udf1 ?? '').trim();
            const domain = String(payload.udf2 ?? '').trim();
            const origin = (0, env_1.getFrontendOrigin)(domain || undefined);
            const url = order
                ? `${origin}/order-success?order=${encodeURIComponent(order)}`
                : `${origin}/orders`;
            res.redirect(302, url);
        }
    });
    /** PayU server webhook / IPN (configure in PayU dashboard or via partner_webhook_*). */
    static payuWebhook = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
        const payload = {
            ...(typeof req.body === 'object' && req.body ? req.body : {}),
            ...(typeof req.query === 'object' && req.query ? req.query : {}),
        };
        const result = await payuPayment_service_1.PayuPaymentService.handleWebhook(payload);
        res.status(200).json(result);
    });
    static verifyPayu = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
        const { orderNumber, txnid, email, phone } = req.body;
        const result = await payuPayment_service_1.PayuPaymentService.verifyAndCapture({
            orderNumber,
            txnid,
            email,
            phone,
        });
        ApiResponse_1.ApiResponse.success(res, result, 'Payment verified');
    });
}
exports.PaymentController = PaymentController;
