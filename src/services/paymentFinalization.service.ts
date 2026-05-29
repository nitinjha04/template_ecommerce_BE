import { Types } from 'mongoose';
import { isEmailEnabled } from '../config/env';
import { Order, Payment, User } from '../models';
import type { IOrder } from '../models/Order.model';
import type { IPayment } from '../models/Payment.model';
import { EmailService } from './email.service';

/**
 * After gateway confirms payment (status 2): persist paidAt + order.paymentInfo,
 * advance order status, clear cart, and send confirmation email once.
 */
export class PaymentFinalizationService {
  /** Idempotent: write order.paymentInfo from a completed payment document. */
  static async ensureOrderPaymentSnapshot(
    orderId: Types.ObjectId,
    payment: IPayment,
    extras?: { paidAt?: Date; gatewayOrderNo?: string }
  ): Promise<void> {
    const paidAt = extras?.paidAt ?? payment.paidAt ?? new Date();
    const gatewayOrderNo =
      extras?.gatewayOrderNo ?? payment.gateway?.gatewayOrderNo;

    const paymentInfo = {
      paymentId: payment._id as Types.ObjectId,
      paymentNumber: payment.paymentNumber,
      status: 'Completed' as const,
      amount: payment.amount,
      method: payment.method,
      provider: payment.provider,
      paidAt,
      merchantOrderNo: payment.gateway?.merchantOrderNo,
      gatewayOrderNo,
    };

    const order = await Order.findById(orderId).select('status paymentInfo').exec();
    if (!order) return;

    const orderSet: Record<string, unknown> = { paymentInfo };
    if (order.status === 'Pending') {
      orderSet.status = 'Processing';
    }

    await Order.updateOne({ _id: orderId }, { $set: orderSet });
  }

  static async finalizeSuccessfulPayment(input: {
    payment: IPayment;
    order: IOrder;
    gatewayOrderNo?: string;
    paidAt?: Date;
  }): Promise<void> {
    const { payment, order } = input;
    const paidAt = input.paidAt ?? new Date();
    const gatewayOrderNo =
      input.gatewayOrderNo ?? payment.gateway?.gatewayOrderNo;

    const paymentSet: Record<string, unknown> = {
      status: 'Completed',
      paidAt,
    };
    if (gatewayOrderNo) {
      paymentSet['gateway.gatewayOrderNo'] = gatewayOrderNo;
    }

    await Payment.updateOne({ _id: payment._id }, { $set: paymentSet });

    await this.ensureOrderPaymentSnapshot(order._id as Types.ObjectId, payment, {
      paidAt,
      gatewayOrderNo,
    });

    if (order.user) {
      await User.updateOne({ _id: order.user }, { $set: { cart: [] } });
    }

    await this.sendPaymentConfirmationEmailOnce(payment._id, order._id);
  }

  /**
   * Repair orders where gateway/payment is complete but order.paymentInfo was never written.
   */
  static async repairFromStoredVerifyResponse(
    order: IOrder,
    payment: IPayment
  ): Promise<boolean> {
    if (payment.status === 'Completed') {
      if (order.paymentInfo?.status !== 'Completed') {
        await this.ensureOrderPaymentSnapshot(
          order._id as Types.ObjectId,
          payment,
          { paidAt: payment.paidAt }
        );
      }
      return true;
    }

    const raw = payment.gateway?.verifyResponse as
      | { data?: { status?: unknown }; status?: unknown }
      | undefined;
    const gatewayStatus =
      raw?.data?.status ?? raw?.status ?? undefined;

    if (String(gatewayStatus) !== '2') return false;

    await this.finalizeSuccessfulPayment({ payment, order });
    return true;
  }

  static async sendPaymentConfirmationEmailOnce(
    paymentId: Types.ObjectId,
    orderId: Types.ObjectId
  ): Promise<void> {
    const freshPayment = await Payment.findById(paymentId).exec();
    if (!freshPayment || freshPayment.gateway?.successEmailSentAt) {
      return;
    }

    if (!isEmailEnabled()) {
      console.warn(
        '[email] Payment confirmation not sent — set EMAIL_ENABLED=true and configure SMTP_HOST, SMTP_USER, SMTP_PASS'
      );
      return;
    }

    const freshOrder = await Order.findById(orderId).exec();
    if (!freshOrder) return;

    try {
      await EmailService.sendOrderPaymentConfirmedEmails(
        freshOrder,
        freshPayment
      );
      await Payment.updateOne(
        { _id: paymentId },
        { $set: { 'gateway.successEmailSentAt': new Date() } }
      );
      console.info(
        `[email] Payment confirmation sent for order ${freshOrder.orderNumber}`
      );
    } catch (err) {
      console.error(
        '[email] Payment confirmation failed:',
        err instanceof Error ? err.message : err
      );
    }
  }
}
