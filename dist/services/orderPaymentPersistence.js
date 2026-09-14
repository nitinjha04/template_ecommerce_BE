"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveOrderPaymentOnGatewaySuccess = saveOrderPaymentOnGatewaySuccess;
exports.parseGatewayVerifyData = parseGatewayVerifyData;
const models_1 = require("../models");
/**
 * When gateway verify returns status 2: persist Payment + Order.paymentInfo immediately.
 * This is the single source of truth for My Orders UI.
 */
async function saveOrderPaymentOnGatewaySuccess(input) {
    const { order, payment, gateway } = input;
    const paidAt = new Date();
    const utr = gateway.utr?.trim() || undefined;
    const gatewayOrderNo = utr;
    const paidAmount = typeof gateway.paymentAmount === 'number'
        ? gateway.paymentAmount
        : typeof gateway.orderAmount === 'number'
            ? gateway.orderAmount
            : payment.amount;
    await models_1.Payment.updateOne({ _id: payment._id }, {
        $set: {
            status: 'Completed',
            paidAt,
            ...(gatewayOrderNo ? { 'gateway.gatewayOrderNo': gatewayOrderNo } : {}),
        },
    });
    const paymentInfo = {
        paymentId: payment._id,
        paymentNumber: payment.paymentNumber,
        status: 'Completed',
        amount: paidAmount,
        method: payment.method,
        provider: payment.provider,
        paidAt,
        merchantOrderNo: gateway.merchantOrderNo,
        gatewayOrderNo,
        utr,
        gatewayStatus: String(gateway.status),
        paidAmount,
    };
    const orderSet = { paymentInfo };
    if (order.status === 'Pending') {
        orderSet.status = 'Processing';
    }
    await models_1.Order.updateOne({ _id: order._id }, { $set: orderSet });
    console.info(`[payment] Saved paymentInfo on order ${order.orderNumber} (merchant ${gateway.merchantOrderNo}, utr ${utr ?? 'n/a'})`);
    return paymentInfo;
}
function parseGatewayVerifyData(raw) {
    if (!raw || typeof raw !== 'object')
        return null;
    const body = raw;
    const data = body.data;
    if (!data || typeof data !== 'object')
        return null;
    const merchantOrderNo = data.merchant_order_no ?? data.merchantOrderNo;
    const status = data.status ?? data.pay_status;
    if (merchantOrderNo == null || status == null)
        return null;
    return {
        status: String(status),
        merchantOrderNo: String(merchantOrderNo),
        utr: data.utr != null ? String(data.utr) : undefined,
        orderAmount: typeof data.order_amount === 'number'
            ? data.order_amount
            : data.order_amount != null
                ? Number(data.order_amount)
                : undefined,
        paymentAmount: typeof data.payment_amount === 'number'
            ? data.payment_amount
            : data.payment_amount != null
                ? Number(data.payment_amount)
                : undefined,
    };
}
