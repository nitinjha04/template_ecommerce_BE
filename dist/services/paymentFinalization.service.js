"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentFinalizationService = void 0;
const env_1 = require("../config/env");
const models_1 = require("../models");
const email_service_1 = require("./email.service");
/**
 * After gateway confirms payment (status 2): persist paidAt + order.paymentInfo,
 * advance order status, clear cart, and send confirmation email once.
 */
class PaymentFinalizationService {
    /** Idempotent: write order.paymentInfo from a completed payment document. */
    static async ensureOrderPaymentSnapshot(orderId, payment, extras) {
        const paidAt = extras?.paidAt ?? payment.paidAt ?? new Date();
        const gatewayOrderNo = extras?.gatewayOrderNo ?? payment.gateway?.gatewayOrderNo;
        const paymentInfo = {
            paymentId: payment._id,
            paymentNumber: payment.paymentNumber,
            status: 'Completed',
            amount: payment.amount,
            method: payment.method,
            provider: payment.provider,
            paidAt,
            merchantOrderNo: payment.gateway?.merchantOrderNo,
            gatewayOrderNo,
        };
        const order = await models_1.Order.findById(orderId).select('status paymentInfo').exec();
        if (!order)
            return;
        const orderSet = { paymentInfo };
        if (order.status === 'Pending') {
            orderSet.status = 'Processing';
        }
        await models_1.Order.updateOne({ _id: orderId }, { $set: orderSet });
    }
    static async finalizeSuccessfulPayment(input) {
        const { payment, order } = input;
        const paidAt = input.paidAt ?? new Date();
        const gatewayOrderNo = input.gatewayOrderNo ?? payment.gateway?.gatewayOrderNo;
        const paymentSet = {
            status: 'Completed',
            paidAt,
        };
        if (gatewayOrderNo) {
            paymentSet['gateway.gatewayOrderNo'] = gatewayOrderNo;
        }
        await models_1.Payment.updateOne({ _id: payment._id }, { $set: paymentSet });
        await this.ensureOrderPaymentSnapshot(order._id, payment, {
            paidAt,
            gatewayOrderNo,
        });
        if (order.user) {
            await models_1.User.updateOne({ _id: order.user }, { $set: { cart: [] } });
        }
        await this.sendPaymentConfirmationEmailOnce(payment._id, order._id);
    }
    /**
     * Repair orders where gateway/payment is complete but order.paymentInfo was never written.
     */
    static async repairFromStoredVerifyResponse(order, payment) {
        if (payment.status === 'Completed') {
            if (order.paymentInfo?.status !== 'Completed') {
                await this.ensureOrderPaymentSnapshot(order._id, payment, { paidAt: payment.paidAt });
            }
            return true;
        }
        const raw = payment.gateway?.verifyResponse;
        const gatewayStatus = raw?.data?.status ?? raw?.status ?? undefined;
        if (String(gatewayStatus) !== '2')
            return false;
        await this.finalizeSuccessfulPayment({ payment, order });
        return true;
    }
    static async sendPaymentConfirmationEmailOnce(paymentId, orderId) {
        const freshPayment = await models_1.Payment.findById(paymentId).exec();
        if (!freshPayment || freshPayment.gateway?.successEmailSentAt) {
            return;
        }
        if (!(0, env_1.isEmailEnabled)()) {
            console.warn('[email] Payment confirmation not sent — set EMAIL_ENABLED=true and configure SMTP_HOST, SMTP_USER, SMTP_PASS');
            return;
        }
        const freshOrder = await models_1.Order.findById(orderId).exec();
        if (!freshOrder)
            return;
        try {
            await email_service_1.EmailService.sendOrderPaymentConfirmedEmails(freshOrder, freshPayment);
            await models_1.Payment.updateOne({ _id: paymentId }, { $set: { 'gateway.successEmailSentAt': new Date() } });
            console.info(`[email] Payment confirmation sent for order ${freshOrder.orderNumber}`);
        }
        catch (err) {
            console.error('[email] Payment confirmation failed:', err instanceof Error ? err.message : err);
        }
    }
}
exports.PaymentFinalizationService = PaymentFinalizationService;
