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
  static async finalizeSuccessfulPayment(input: {
    payment: IPayment;
    order: IOrder;
    gatewayOrderNo?: string;
  }): Promise<void> {
    const { payment, order } = input;
    const paidAt = new Date();
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

    const orderSet: Record<string, unknown> = { paymentInfo };
    if (order.status === 'Pending') {
      orderSet.status = 'Processing';
    }

    await Order.updateOne({ _id: order._id }, { $set: orderSet });

    if (order.user) {
      await User.updateOne({ _id: order.user }, { $set: { cart: [] } });
    }

    await this.sendPaymentConfirmationEmailOnce(payment._id, order._id);
  }

  private static async sendPaymentConfirmationEmailOnce(
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
