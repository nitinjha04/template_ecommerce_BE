"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PayuPaymentService = exports.buildPayuReverseHash = exports.buildPayuPaymentHash = void 0;
const crypto_1 = __importDefault(require("crypto"));
const env_1 = require("../config/env");
const store_context_1 = require("../context/store.context");
const models_1 = require("../models");
const ApiError_1 = require("../utils/ApiError");
const devOrderAmount_1 = require("../utils/devOrderAmount");
const storeScope_1 = require("../utils/storeScope");
const paymentFinalization_service_1 = require("./paymentFinalization.service");
const paymentSideEffects_1 = require("./paymentSideEffects");
const maskPrefix = (value, len = 6) => {
    const v = String(value ?? '');
    if (!v)
        return '(empty)';
    if (v.length <= len)
        return `${v}…`;
    return `${v.slice(0, len)}…`;
};
const payuActionUrl = (payuEnv) => payuEnv === 'test'
    ? 'https://test.payu.in/_payment'
    : 'https://secure.payu.in/_payment';
const sha512 = (value) => crypto_1.default.createHash('sha512').update(value).digest('hex');
/**
 * Payment request hash (PayU India hosted checkout):
 * sha512(key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||SALT)
 * Exactly 5 empty slots after udf5 (six `|` before SALT) — not 6.
 */
const buildPayuPaymentHash = (input) => {
    const sequence = [
        input.key,
        input.txnid,
        input.amount,
        input.productinfo,
        input.firstname,
        input.email,
        input.udf1 ?? '',
        input.udf2 ?? '',
        input.udf3 ?? '',
        input.udf4 ?? '',
        input.udf5 ?? '',
        '', // empty after udf5 (1/5)
        '', // 2/5
        '', // 3/5
        '', // 4/5
        '', // 5/5
        input.salt,
    ].join('|');
    return sha512(sequence);
};
exports.buildPayuPaymentHash = buildPayuPaymentHash;
/**
 * Reverse hash from PayU callback:
 * sha512(SALT|status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key)
 * Exactly 5 empty slots after status.
 */
const buildPayuReverseHash = (input) => {
    const sequence = [
        input.salt,
        input.status,
        '', // empty after status (1/5)
        '', // 2/5
        '', // 3/5
        '', // 4/5
        '', // 5/5
        input.udf5 ?? '',
        input.udf4 ?? '',
        input.udf3 ?? '',
        input.udf2 ?? '',
        input.udf1 ?? '',
        input.email,
        input.firstname,
        input.productinfo,
        input.amount,
        input.txnid,
        input.key,
    ].join('|');
    return sha512(sequence);
};
exports.buildPayuReverseHash = buildPayuReverseHash;
const isSuccessStatus = (status) => {
    const s = String(status ?? '').toLowerCase();
    return s === 'success' || s === 'captured';
};
class PayuPaymentService {
    static log(step, details) {
        if (details) {
            console.info(`[payu] ${step}`, details);
            return;
        }
        console.info(`[payu] ${step}`);
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
    static async resolveCredsForOrder(order, savedKey) {
        if (savedKey) {
            const byKey = (0, env_1.resolvePayuCredentialsByKey)(savedKey);
            if (byKey) {
                const storeDomain = await this.resolveStoreDomainForOrder(order);
                return { creds: byKey, storeDomain, source: 'payment.key' };
            }
        }
        const storeDomain = await this.resolveStoreDomainForOrder(order);
        const creds = (0, env_1.resolvePayuCredentials)(storeDomain);
        if (!creds) {
            throw new ApiError_1.ApiError(500, 'PayU is not configured for this store');
        }
        const source = (0, env_1.hasStorePayuMapping)(storeDomain)
            ? 'STORE_PAYU_KEYS'
            : 'PAYU_KEY (global fallback)';
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
    static buildTxnid(orderNumber) {
        const base = orderNumber.replace(/[^a-zA-Z0-9]/g, '').slice(0, 12);
        const suffix = Date.now().toString(36);
        return `${base}${suffix}`.slice(0, 25);
    }
    static async finalizePaid(input) {
        const { order, payment } = input;
        const paidAt = payment.paidAt ?? new Date();
        if (payment.status === 'Completed') {
            await paymentFinalization_service_1.PaymentFinalizationService.ensureOrderPaymentSnapshot(order._id, payment, { paidAt, gatewayOrderNo: input.mihpayid || input.txnid });
            return;
        }
        await models_1.Payment.updateOne({ _id: payment._id }, {
            $set: {
                status: 'Completed',
                paidAt,
                provider: 'payu',
                method: 'PayU',
                'payu.txnid': input.txnid,
                ...(input.mihpayid ? { 'payu.mihpayid': input.mihpayid } : {}),
                ...(input.status ? { 'payu.status': input.status } : {}),
                ...(input.returnData ? { 'payu.returnData': input.returnData } : {}),
            },
        });
        const freshPayment = await models_1.Payment.findById(payment._id);
        if (!freshPayment)
            return;
        await paymentFinalization_service_1.PaymentFinalizationService.ensureOrderPaymentSnapshot(order._id, freshPayment, { paidAt, gatewayOrderNo: input.mihpayid || input.txnid });
        if (order.status === 'Pending') {
            await models_1.Order.updateOne({ _id: order._id }, { $set: { status: 'Processing' } });
        }
        (0, paymentSideEffects_1.runPaymentSuccessSideEffects)({
            paymentId: freshPayment._id,
            orderId: order._id,
            userId: order.user,
        });
    }
    static async createForOrder(input) {
        if (!(0, env_1.isPayuConfigured)()) {
            throw new ApiError_1.ApiError(500, 'PayU is not configured');
        }
        this.log('createForOrder:start', {
            orderNumber: input.orderNumber,
            storeContext: (0, store_context_1.getStoreContext)()?.storeDomain ?? '(none)',
            storePayuDomains: (0, env_1.listStorePayuDomains)(),
        });
        const { order, payment } = await this.assertOrderAccess(input.orderNumber, input.email, input.phone);
        if (payment.status === 'Completed') {
            throw new ApiError_1.ApiError(400, 'Order is already paid');
        }
        const { creds, storeDomain, source } = await this.resolveCredsForOrder(order, payment.payu?.key);
        this.log('createForOrder:using_keys', {
            keyPrefix: maskPrefix(creds.key, 6),
            saltPrefix: maskPrefix(creds.salt, 6),
            clientIdPrefix: maskPrefix(creds.clientId, 6),
            env: creds.env,
            orderNumber: order.orderNumber,
            storeDomain: storeDomain ?? '(none)',
            source,
            route: 'POST /payments/create (provider=payu)',
        });
        const orderTotal = Number(order.total) || 0;
        const chargeTotal = (0, devOrderAmount_1.applyDevTestOrderTotal)(orderTotal);
        const amount = (Math.max(1, Math.round(chargeTotal * 100) / 100)).toFixed(2);
        const isDevCharge = (0, devOrderAmount_1.shouldApplyDevTestOrderAmount)();
        const txnid = this.buildTxnid(order.orderNumber);
        const firstname = (input.name?.trim() ||
            order.customerName ||
            'Customer')
            .split(/\s+/)[0]
            ?.slice(0, 60) || 'Customer';
        const email = (input.email?.trim().toLowerCase() ||
            order.email ||
            'customer@example.com').slice(0, 100);
        const phone = (input.phone?.trim() ||
            order.phone ||
            '9999999999').replace(/\D/g, '').slice(-10) || '9999999999';
        const productinfo = `Order ${order.orderNumber}`.slice(0, 100);
        const udf1 = order.orderNumber;
        const udf2 = storeDomain ?? '';
        const hash = (0, exports.buildPayuPaymentHash)({
            key: creds.key,
            salt: creds.salt,
            txnid,
            amount,
            productinfo,
            firstname,
            email,
            udf1,
            udf2,
        });
        const apiOrigin = (0, env_1.getApiPublicOrigin)();
        const surl = `${apiOrigin}/api/v1/payments/payu/return`;
        const furl = `${apiOrigin}/api/v1/payments/payu/return`;
        const webhookUrl = `${apiOrigin}/api/v1/payments/payu/webhook`;
        const actionUrl = payuActionUrl(creds.env);
        await models_1.Payment.updateOne({ _id: payment._id }, {
            $set: {
                provider: 'payu',
                method: 'PayU',
                status: 'Pending',
                payu: {
                    key: creds.key,
                    txnid,
                    amount,
                    productinfo,
                    hash,
                    env: creds.env,
                    createResponse: {
                        txnid,
                        amount,
                        productinfo,
                        firstname,
                        email,
                        phone,
                        udf1,
                        udf2,
                        surl,
                        furl,
                        webhookUrl,
                        actionUrl,
                        ...(isDevCharge
                            ? { devTestCharge: true, originalOrderTotal: orderTotal }
                            : {}),
                    },
                },
            },
        });
        this.log('createForOrder:created', {
            orderNumber: order.orderNumber,
            txnid,
            amount,
            keyPrefix: maskPrefix(creds.key, 6),
            storeDomain: storeDomain ?? '(none)',
            actionUrl,
            webhookUrl,
            nodeEnv: env_1.env.nodeEnv,
            devTestCharge: isDevCharge,
        });
        return {
            key: creds.key,
            txnid,
            amount,
            productinfo,
            firstname,
            email,
            phone,
            surl,
            furl,
            hash,
            udf1,
            udf2,
            actionUrl,
            /** PayU dashboard + per-txn partner webhook (same endpoint). */
            partnerWebhookSuccess: webhookUrl,
            partnerWebhookFailure: webhookUrl,
            orderNumber: order.orderNumber,
            env: creds.env,
        };
    }
    /**
     * Shared PayU callback processor (browser return + server webhook).
     * Verifies reverse hash and finalizes on success.
     */
    static async processCallback(payload, source) {
        const txnid = String(payload.txnid ?? '').trim();
        const status = String(payload.status ?? '').trim();
        const key = String(payload.key ?? '').trim();
        const orderNumberUdf = String(payload.udf1 ?? '').trim();
        const storeDomainHint = String(payload.udf2 ?? '').trim();
        this.log(`${source}:start`, {
            txnid,
            status,
            orderNumber: orderNumberUdf || '(none)',
            keyPrefix: maskPrefix(key, 6),
        });
        if (!txnid) {
            throw new ApiError_1.ApiError(400, 'Missing PayU txnid');
        }
        let payment = await models_1.Payment.findOne({ 'payu.txnid': txnid });
        if (!payment && orderNumberUdf) {
            const linkedOrder = await models_1.Order.findOne({ orderNumber: orderNumberUdf }).select('_id');
            if (linkedOrder) {
                payment = await models_1.Payment.findOne({ order: linkedOrder._id });
            }
        }
        if (!payment) {
            throw new ApiError_1.ApiError(404, 'Payment not found for PayU txnid');
        }
        const order = await models_1.Order.findById(payment.order);
        if (!order) {
            throw new ApiError_1.ApiError(404, 'Order not found for PayU payment');
        }
        const storeDomain = storeDomainHint || (await this.resolveStoreDomainForOrder(order));
        const { creds } = await this.resolveCredsForOrder(order, payment.payu?.key || key);
        const expectedHash = (0, exports.buildPayuReverseHash)({
            key: creds.key,
            salt: creds.salt,
            status,
            email: String(payload.email ?? ''),
            firstname: String(payload.firstname ?? ''),
            productinfo: String(payload.productinfo ?? ''),
            amount: String(payload.amount ?? ''),
            txnid,
            udf1: String(payload.udf1 ?? ''),
            udf2: String(payload.udf2 ?? ''),
            udf3: String(payload.udf3 ?? ''),
            udf4: String(payload.udf4 ?? ''),
            udf5: String(payload.udf5 ?? ''),
        });
        const receivedHash = String(payload.hash ?? '').toLowerCase();
        if (receivedHash && expectedHash.toLowerCase() !== receivedHash) {
            this.log(`${source}:invalid_hash`, {
                txnid,
                orderNumber: order.orderNumber,
                keyPrefix: maskPrefix(creds.key, 6),
            });
            throw new ApiError_1.ApiError(400, 'Invalid PayU response hash');
        }
        const success = isSuccessStatus(status);
        if (success) {
            await this.finalizePaid({
                order,
                payment,
                txnid,
                mihpayid: payload.mihpayid ? String(payload.mihpayid) : undefined,
                status,
                returnData: payload,
            });
            this.log(`${source}:paid`, {
                orderNumber: order.orderNumber,
                txnid,
            });
        }
        else {
            await models_1.Payment.updateOne({ _id: payment._id }, {
                $set: {
                    ...(status ? { 'payu.status': status } : {}),
                    ...(source === 'webhook'
                        ? { 'payu.webhookData': payload }
                        : { 'payu.returnData': payload }),
                },
            });
            this.log(`${source}:not_paid`, {
                orderNumber: order.orderNumber,
                txnid,
                status,
            });
        }
        return {
            success,
            orderNumber: order.orderNumber,
            storeDomain: storeDomain || undefined,
            txnid,
        };
    }
    /** PayU browser return (surl/furl) — verify reverse hash and redirect to storefront. */
    static async handleReturn(payload) {
        const result = await this.processCallback(payload, 'return');
        const frontend = (0, env_1.getFrontendOrigin)(result.storeDomain);
        if (result.success) {
            return {
                redirectUrl: `${frontend}/order-success?order=${encodeURIComponent(result.orderNumber)}`,
            };
        }
        // Do not clear cart on FE — user cancelled / failed; send them to checkout.
        return {
            redirectUrl: `${frontend}/checkout?payu=failed&order=${encodeURIComponent(result.orderNumber)}&txnid=${encodeURIComponent(result.txnid)}`,
        };
    }
    /** PayU server webhook / IPN — same payload as return; respond 200 quickly. */
    static async handleWebhook(payload) {
        const result = await this.processCallback(payload, 'webhook');
        return {
            ok: true,
            paid: result.success,
            orderNumber: result.orderNumber,
        };
    }
    static async verifyAndCapture(input) {
        if (!(0, env_1.isPayuConfigured)()) {
            throw new ApiError_1.ApiError(500, 'PayU is not configured');
        }
        const { order, payment } = await this.assertOrderAccess(input.orderNumber, input.email, input.phone);
        const txnid = (input.txnid || payment.payu?.txnid || '').trim();
        if (!txnid) {
            throw new ApiError_1.ApiError(400, 'PayU txnid is required');
        }
        if (payment.status === 'Completed') {
            return {
                orderNumber: order.orderNumber,
                paymentId: payment.payu?.mihpayid || txnid,
                status: 'Completed',
            };
        }
        // Without PayU return payload we cannot reverse-hash; require completed status on payment from return handler.
        if (!isSuccessStatus(payment.payu?.status)) {
            throw new ApiError_1.ApiError(400, 'PayU payment not completed yet. Finish checkout on PayU and wait for return.');
        }
        await this.finalizePaid({
            order,
            payment,
            txnid,
            mihpayid: payment.payu?.mihpayid,
            status: payment.payu?.status,
        });
        return {
            orderNumber: order.orderNumber,
            paymentId: payment.payu?.mihpayid || txnid,
            status: 'Completed',
        };
    }
}
exports.PayuPaymentService = PayuPaymentService;
