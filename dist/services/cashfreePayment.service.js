"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CashfreePaymentService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const axios_1 = __importStar(require("axios"));
const env_1 = require("../config/env");
const store_context_1 = require("../context/store.context");
const models_1 = require("../models");
const ApiError_1 = require("../utils/ApiError");
const devOrderAmount_1 = require("../utils/devOrderAmount");
const storeScope_1 = require("../utils/storeScope");
const paymentFinalization_service_1 = require("./paymentFinalization.service");
const paymentSideEffects_1 = require("./paymentSideEffects");
const CF_API_VERSION = '2023-08-01';
const maskPrefix = (value, len = 6) => {
    const v = String(value ?? '');
    if (!v)
        return '(empty)';
    if (v.length <= len)
        return `${v}…`;
    return `${v.slice(0, len)}…`;
};
const cashfreeBaseUrl = (cfEnv) => cfEnv === 'sandbox'
    ? 'https://sandbox.cashfree.com/pg'
    : 'https://api.cashfree.com/pg';
const isPaidStatus = (status) => {
    const s = String(status ?? '').toUpperCase();
    return s === 'PAID' || s === 'SUCCESS' || s === 'COMPLETED';
};
class CashfreePaymentService {
    static log(step, details) {
        if (details) {
            console.info(`[cashfree] ${step}`, details);
            return;
        }
        console.info(`[cashfree] ${step}`);
    }
    static credsLogFields(creds, extra) {
        return {
            appIdPrefix: maskPrefix(creds.appId, 6),
            secretPrefix: maskPrefix(creds.secretKey, 6),
            env: creds.env,
            ...extra,
        };
    }
    static headers(creds) {
        return {
            'Content-Type': 'application/json',
            'x-api-version': CF_API_VERSION,
            'x-client-id': creds.appId,
            'x-client-secret': creds.secretKey,
        };
    }
    static async resolveStoreDomainForOrder(order) {
        const fromCtx = (0, store_context_1.getStoreContext)()?.storeDomain?.trim();
        if (fromCtx)
            return fromCtx;
        if (order.store) {
            const store = await models_1.Store.findById(order.store).select('domain').lean();
            return store?.domain?.trim() || undefined;
        }
        return undefined;
    }
    static async resolveCredsForOrder(order, savedAppId) {
        if (savedAppId) {
            const byApp = (0, env_1.resolveCashfreeCredentialsByAppId)(savedAppId);
            if (byApp) {
                const storeDomain = await this.resolveStoreDomainForOrder(order);
                return { creds: byApp, storeDomain, source: 'payment.appId' };
            }
        }
        const storeDomain = await this.resolveStoreDomainForOrder(order);
        const creds = (0, env_1.resolveCashfreeCredentials)(storeDomain);
        if (!creds) {
            throw new ApiError_1.ApiError(500, 'Cashfree is not configured for this store');
        }
        const source = (0, env_1.hasStoreCashfreeMapping)(storeDomain)
            ? 'STORE_CASHFREE_KEYS'
            : 'CASHFREE_APP_ID (global fallback)';
        return { creds, storeDomain, source };
    }
    static async assertOrderAccess(orderNumber, email, phone) {
        const order = await models_1.Order.findOne((0, storeScope_1.mergeStoreFilter)({ orderNumber: orderNumber.trim() }));
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
    static buildCashfreeOrderId(orderNumber) {
        const base = orderNumber.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 28);
        const suffix = Date.now().toString(36);
        return `${base}_${suffix}`.slice(0, 45);
    }
    static axiosMessage(err) {
        if (err instanceof axios_1.AxiosError) {
            const data = err.response?.data;
            return data?.message || err.message;
        }
        return err instanceof Error ? err.message : String(err);
    }
    static async createForOrder(input) {
        if (!(0, env_1.isCashfreeConfigured)()) {
            throw new ApiError_1.ApiError(500, 'Cashfree is not configured');
        }
        this.log('createForOrder:start', {
            orderNumber: input.orderNumber,
            storeContext: (0, store_context_1.getStoreContext)()?.storeDomain ?? '(none)',
            storeCashfreeDomains: (0, env_1.listStoreCashfreeDomains)(),
        });
        const { order, payment } = await this.assertOrderAccess(input.orderNumber, input.email, input.phone);
        if (payment.status === 'Completed') {
            throw new ApiError_1.ApiError(400, 'Order is already paid');
        }
        const { creds, storeDomain, source } = await this.resolveCredsForOrder(order, payment.cashfree?.appId);
        this.log('createForOrder:using_keys', this.credsLogFields(creds, {
            orderNumber: order.orderNumber,
            storeDomain: storeDomain ?? '(none)',
            source,
            route: 'POST /payments/create (provider=cashfree)',
        }));
        const orderTotal = Number(order.total) || 0;
        const chargeTotal = (0, devOrderAmount_1.applyDevTestOrderTotal)(orderTotal);
        const amount = Math.max(1, Math.round(chargeTotal * 100) / 100);
        const isDevCharge = (0, devOrderAmount_1.shouldApplyDevTestOrderAmount)();
        const cashfreeOrderId = this.buildCashfreeOrderId(order.orderNumber);
        const customerPhone = (input.phone?.trim() ||
            order.phone ||
            '9999999999').replace(/\D/g, '').slice(-10);
        const customerId = String(order.user ?? order._id).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 50) || `cust_${Date.now()}`;
        const returnOrigin = (0, env_1.getFrontendOrigin)(storeDomain);
        const notifyUrl = `${(0, env_1.getApiPublicOrigin)()}/api/v1/payments/cashfree/webhook`;
        const payload = {
            order_id: cashfreeOrderId,
            order_amount: amount,
            order_currency: 'INR',
            customer_details: {
                customer_id: customerId,
                customer_name: (input.name?.trim() || order.customerName || 'Customer').slice(0, 100),
                customer_email: (input.email?.trim().toLowerCase() ||
                    order.email ||
                    'customer@example.com').slice(0, 100),
                customer_phone: customerPhone.length >= 10 ? customerPhone : '9999999999',
            },
            order_meta: {
                return_url: `${returnOrigin}/payment-return?order=${encodeURIComponent(order.orderNumber)}&cf_order={order_id}`,
                notify_url: notifyUrl,
            },
            order_note: isDevCharge
                ? `devTest original=${orderTotal}`
                : `Order ${order.orderNumber}`,
        };
        this.log('createForOrder:amount', {
            orderNumber: order.orderNumber,
            orderTotal,
            chargeTotal: amount,
            cashfreeOrderId,
            nodeEnv: env_1.env.nodeEnv,
            devTestCharge: isDevCharge,
        });
        let created;
        try {
            const { data } = await axios_1.default.post(`${cashfreeBaseUrl(creds.env)}/orders`, payload, { headers: this.headers(creds), timeout: 30000 });
            created = data;
        }
        catch (err) {
            this.log('createForOrder:api_error', this.credsLogFields(creds, {
                orderNumber: order.orderNumber,
                error: this.axiosMessage(err),
            }));
            throw new ApiError_1.ApiError(502, `Cashfree create failed: ${this.axiosMessage(err)}`);
        }
        const paymentSessionId = String(created.payment_session_id ?? '').trim();
        if (!paymentSessionId) {
            throw new ApiError_1.ApiError(502, 'Cashfree did not return payment_session_id');
        }
        await models_1.Payment.updateOne({ _id: payment._id }, {
            $set: {
                provider: 'cashfree',
                method: 'Cashfree',
                status: 'Pending',
                cashfree: {
                    appId: creds.appId,
                    orderId: created.order_id || cashfreeOrderId,
                    paymentSessionId,
                    amount,
                    currency: 'INR',
                    env: creds.env,
                    createResponse: created,
                },
            },
        });
        this.log('createForOrder:created', this.credsLogFields(creds, {
            orderNumber: order.orderNumber,
            cashfreeOrderId: created.order_id || cashfreeOrderId,
            amount,
            storeDomain: storeDomain ?? '(none)',
        }));
        return {
            appId: creds.appId,
            paymentSessionId,
            cashfreeOrderId: String(created.order_id || cashfreeOrderId),
            orderNumber: order.orderNumber,
            amount,
            currency: 'INR',
            env: creds.env,
            name: input.name?.trim() || undefined,
            email: input.email?.trim().toLowerCase() || order.email,
            phone: input.phone?.trim() || order.phone,
        };
    }
    static async fetchOrder(creds, cashfreeOrderId) {
        const { data } = await axios_1.default.get(`${cashfreeBaseUrl(creds.env)}/orders/${encodeURIComponent(cashfreeOrderId)}`, { headers: this.headers(creds), timeout: 30000 });
        return data;
    }
    static async finalizePaid(input) {
        const { order, payment } = input;
        const paidAt = payment.paidAt ?? new Date();
        if (payment.status === 'Completed') {
            await paymentFinalization_service_1.PaymentFinalizationService.ensureOrderPaymentSnapshot(order._id, payment, { paidAt, gatewayOrderNo: input.cashfreePaymentId || input.cashfreeOrderId });
            return;
        }
        await models_1.Payment.updateOne({ _id: payment._id }, {
            $set: {
                status: 'Completed',
                paidAt,
                provider: 'cashfree',
                method: 'Cashfree',
                'cashfree.orderId': input.cashfreeOrderId,
                ...(input.cashfreePaymentId
                    ? { 'cashfree.paymentId': input.cashfreePaymentId }
                    : {}),
                ...(input.webhookData
                    ? { 'cashfree.webhookData': input.webhookData }
                    : {}),
            },
        });
        const freshPayment = await models_1.Payment.findById(payment._id);
        if (!freshPayment)
            return;
        await paymentFinalization_service_1.PaymentFinalizationService.ensureOrderPaymentSnapshot(order._id, freshPayment, {
            paidAt,
            gatewayOrderNo: input.cashfreePaymentId || input.cashfreeOrderId,
        });
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
        if (!(0, env_1.isCashfreeConfigured)()) {
            throw new ApiError_1.ApiError(500, 'Cashfree is not configured');
        }
        const { order, payment } = await this.assertOrderAccess(input.orderNumber, input.email, input.phone);
        const cashfreeOrderId = (input.cashfree_order_id ||
            payment.cashfree?.orderId ||
            '').trim();
        if (!cashfreeOrderId) {
            throw new ApiError_1.ApiError(400, 'Cashfree order id is required');
        }
        const { creds, storeDomain, source } = await this.resolveCredsForOrder(order, payment.cashfree?.appId);
        this.log('verifyAndCapture:using_keys', this.credsLogFields(creds, {
            orderNumber: order.orderNumber,
            storeDomain: storeDomain ?? '(none)',
            source,
            cashfreeOrderId,
            route: 'POST /payments/cashfree/verify',
        }));
        let remote;
        try {
            remote = await this.fetchOrder(creds, cashfreeOrderId);
        }
        catch (err) {
            throw new ApiError_1.ApiError(502, `Cashfree verify failed: ${this.axiosMessage(err)}`);
        }
        if (!isPaidStatus(remote.order_status)) {
            throw new ApiError_1.ApiError(400, `Cashfree payment not completed (status: ${remote.order_status ?? 'unknown'})`);
        }
        if (payment.cashfree?.orderId &&
            payment.cashfree.orderId !== cashfreeOrderId) {
            throw new ApiError_1.ApiError(400, 'Cashfree order does not match this store order');
        }
        await this.finalizePaid({
            order,
            payment,
            cashfreeOrderId,
        });
        this.log('verifyAndCapture:ok', {
            orderNumber: order.orderNumber,
            cashfreeOrderId,
            appIdPrefix: maskPrefix(creds.appId, 6),
        });
        return {
            orderNumber: order.orderNumber,
            paymentId: cashfreeOrderId,
            status: 'Completed',
        };
    }
    static verifyWebhookSignature(rawBody, signature, timestamp, secretKey) {
        if (!signature || !timestamp || !secretKey)
            return false;
        const body = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8');
        const expected = crypto_1.default
            .createHmac('sha256', secretKey)
            .update(timestamp + body)
            .digest('base64');
        try {
            return crypto_1.default.timingSafeEqual(Buffer.from(expected), Buffer.from(String(signature)));
        }
        catch {
            return false;
        }
    }
    static async handleWebhook(rawBody, signature, timestamp, event) {
        if (!(0, env_1.isCashfreeConfigured)()) {
            this.log('webhook:skipped_not_configured');
            return;
        }
        const cashfreeOrderId = event.data?.order?.order_id?.trim();
        if (!cashfreeOrderId) {
            this.log('webhook:missing_order_id', { type: event.type });
            return;
        }
        const payment = await models_1.Payment.findOne({
            'cashfree.orderId': cashfreeOrderId,
        });
        if (!payment) {
            this.log('webhook:payment_not_found', { cashfreeOrderId });
            return;
        }
        const order = await models_1.Order.findById(payment.order);
        if (!order) {
            this.log('webhook:order_not_found', { cashfreeOrderId });
            return;
        }
        const { creds } = await this.resolveCredsForOrder(order, payment.cashfree?.appId);
        if (!this.verifyWebhookSignature(rawBody, signature, timestamp, creds.secretKey)) {
            throw new ApiError_1.ApiError(400, 'Invalid Cashfree webhook signature');
        }
        const type = String(event.type ?? '').toUpperCase();
        const paymentStatus = String(event.data?.payment?.payment_status ?? '').toUpperCase();
        const orderStatus = String(event.data?.order?.order_status ?? '').toUpperCase();
        const success = type.includes('SUCCESS') ||
            isPaidStatus(paymentStatus) ||
            isPaidStatus(orderStatus);
        if (!success) {
            this.log('webhook:ignored_event', { type, paymentStatus, orderStatus });
            return;
        }
        await this.finalizePaid({
            order,
            payment,
            cashfreeOrderId,
            cashfreePaymentId: event.data?.payment?.cf_payment_id
                ? String(event.data.payment.cf_payment_id)
                : undefined,
            webhookData: event,
        });
        this.log('webhook:finalized', {
            orderNumber: order.orderNumber,
            cashfreeOrderId,
            type,
            appIdPrefix: maskPrefix(creds.appId, 6),
        });
    }
}
exports.CashfreePaymentService = CashfreePaymentService;
