import crypto from 'crypto';
import Razorpay from 'razorpay';
import { Types } from 'mongoose';
import { env, isRazorpayConfigured } from '../config/env';
import { Order, Payment } from '../models';
import type { IOrder } from '../models/Order.model';
import type { IPayment } from '../models/Payment.model';
import { ApiError } from '../utils/ApiError';
import { applyDevTestOrderTotal, shouldApplyDevTestOrderAmount } from '../utils/devOrderAmount';
import { mergeStoreFilter } from '../utils/storeScope';
import { PaymentFinalizationService } from './paymentFinalization.service';
import { runPaymentSuccessSideEffects } from './paymentSideEffects';

export type RazorpayCreateResult = {
  keyId: string;
  razorpayOrderId: string;
  amount: number;
  currency: string;
  orderNumber: string;
  name?: string;
  email?: string;
  phone?: string;
};

export type RazorpayVerifyInput = {
  orderNumber: string;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  email?: string;
  phone?: string;
};

type RazorpayWebhookEvent = {
  event?: string;
  payload?: {
    payment?: {
      entity?: {
        id?: string;
        order_id?: string;
        amount?: number;
        status?: string;
        notes?: Record<string, string>;
      };
    };
  };
};

export class RazorpayPaymentService {
  private static client: Razorpay | null = null;

  private static log(step: string, details?: Record<string, unknown>) {
    if (details) {
      console.info(`[razorpay] ${step}`, details);
      return;
    }
    console.info(`[razorpay] ${step}`);
  }

  private static getClient(): Razorpay {
    if (!isRazorpayConfigured()) {
      throw new ApiError(500, 'Razorpay is not configured');
    }
    if (!this.client) {
      this.client = new Razorpay({
        key_id: env.razorpay.keyId,
        key_secret: env.razorpay.keySecret,
      });
    }
    return this.client;
  }

  static verifyCheckoutSignature(
    orderId: string,
    paymentId: string,
    signature: string
  ): boolean {
    const body = `${orderId}|${paymentId}`;
    const expected = crypto
      .createHmac('sha256', env.razorpay.keySecret)
      .update(body)
      .digest('hex');
    try {
      return crypto.timingSafeEqual(
        Buffer.from(expected),
        Buffer.from(String(signature))
      );
    } catch {
      return false;
    }
  }

  static verifyWebhookSignature(rawBody: Buffer | string, signature: string): boolean {
    const secret = env.razorpay.webhookSecret;
    if (!secret) return false;
    const expected = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');
    try {
      return crypto.timingSafeEqual(
        Buffer.from(expected),
        Buffer.from(String(signature))
      );
    } catch {
      return false;
    }
  }

  private static async assertOrderAccess(
    orderNumber: string,
    email?: string,
    phone?: string,
    scoped = true
  ): Promise<{ order: IOrder; payment: IPayment }> {
    const filter = scoped
      ? mergeStoreFilter({ orderNumber: orderNumber.trim() })
      : { orderNumber: orderNumber.trim() };
    const order = await Order.findOne(filter);
    if (!order) throw new ApiError(404, 'Order not found');

    if (email && order.email !== email.trim().toLowerCase()) {
      throw new ApiError(403, 'Order email does not match');
    }
    if (phone) {
      const digits = phone.replace(/\D/g, '');
      const orderDigits = String(order.phone ?? '').replace(/\D/g, '');
      if (digits && orderDigits && digits !== orderDigits) {
        throw new ApiError(403, 'Order phone does not match');
      }
    }

    const payment = await Payment.findOne({ order: order._id });
    if (!payment) throw new ApiError(404, 'Payment record not found for order');

    return { order, payment };
  }

  static async createForOrder(input: {
    orderNumber: string;
    email?: string;
    phone?: string;
    name?: string;
  }): Promise<RazorpayCreateResult> {
    if (!isRazorpayConfigured()) {
      throw new ApiError(500, 'Razorpay is not configured');
    }

    this.log('createForOrder:start', { orderNumber: input.orderNumber });
    const { order, payment } = await this.assertOrderAccess(
      input.orderNumber,
      input.email,
      input.phone
    );

    if (payment.status === 'Completed') {
      throw new ApiError(400, 'Order is already paid');
    }

    // Development: always charge ₹1 on Razorpay (keep real order.total on the order record).
    // Override: DEV_FORCE_ORDER_AMOUNT=false uses full order total even in development.
    // DEV_TEST_ORDER_AMOUNT can change the test charge (default 1).
    const orderTotal = Number(order.total) || 0;
    const chargeTotal = applyDevTestOrderTotal(orderTotal);
    const amountPaise = Math.max(100, Math.round(chargeTotal * 100)); // Razorpay min = 100 paise
    const isDevCharge = chargeTotal !== orderTotal || shouldApplyDevTestOrderAmount();

    this.log('createForOrder:amount', {
      orderNumber: order.orderNumber,
      orderTotal,
      chargeTotal,
      amountPaise,
      nodeEnv: env.nodeEnv,
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

    await Payment.updateOne(
      { _id: payment._id },
      {
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
      }
    );

    this.log('createForOrder:created', {
      orderNumber: order.orderNumber,
      razorpayOrderId: rzpOrder.id,
      amountPaise,
    });

    return {
      keyId: env.razorpay.keyId,
      razorpayOrderId: rzpOrder.id,
      amount: amountPaise,
      currency: 'INR',
      orderNumber: order.orderNumber,
      name: input.name?.trim() || undefined,
      email: input.email?.trim().toLowerCase() || order.email,
      phone: input.phone?.trim() || order.phone,
    };
  }

  private static async finalizePaid(input: {
    order: IOrder;
    payment: IPayment;
    razorpayOrderId: string;
    razorpayPaymentId: string;
    signature?: string;
    webhookData?: unknown;
  }): Promise<void> {
    const { order, payment } = input;
    const paidAt = payment.paidAt ?? new Date();

    if (payment.status === 'Completed') {
      await PaymentFinalizationService.ensureOrderPaymentSnapshot(
        order._id as Types.ObjectId,
        payment,
        { paidAt, gatewayOrderNo: input.razorpayPaymentId }
      );
      return;
    }

    await Payment.updateOne(
      { _id: payment._id },
      {
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
      }
    );

    const freshPayment = await Payment.findById(payment._id);
    if (!freshPayment) return;

    await PaymentFinalizationService.ensureOrderPaymentSnapshot(
      order._id as Types.ObjectId,
      freshPayment,
      { paidAt, gatewayOrderNo: input.razorpayPaymentId }
    );

    if (order.status === 'Pending') {
      await Order.updateOne(
        { _id: order._id },
        { $set: { status: 'Processing' } }
      );
    }

    runPaymentSuccessSideEffects({
      paymentId: freshPayment._id as Types.ObjectId,
      orderId: order._id as Types.ObjectId,
      userId: order.user,
    });
  }

  static async verifyAndCapture(input: RazorpayVerifyInput): Promise<{
    orderNumber: string;
    paymentId: string;
    status: 'Completed';
  }> {
    if (!isRazorpayConfigured()) {
      throw new ApiError(500, 'Razorpay is not configured');
    }

    const valid = this.verifyCheckoutSignature(
      input.razorpay_order_id,
      input.razorpay_payment_id,
      input.razorpay_signature
    );
    if (!valid) {
      throw new ApiError(400, 'Invalid Razorpay payment signature');
    }

    const { order, payment } = await this.assertOrderAccess(
      input.orderNumber,
      input.email,
      input.phone
    );

    if (
      payment.razorpay?.orderId &&
      payment.razorpay.orderId !== input.razorpay_order_id
    ) {
      throw new ApiError(400, 'Razorpay order does not match this store order');
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

  static async handleWebhook(
    rawBody: Buffer | string,
    signature: string | undefined,
    event: RazorpayWebhookEvent
  ): Promise<void> {
    if (!isRazorpayConfigured()) {
      this.log('webhook:skipped_not_configured');
      return;
    }

    if (!env.razorpay.webhookSecret) {
      this.log('webhook:skipped_no_webhook_secret');
      return;
    }

    if (!signature || !this.verifyWebhookSignature(rawBody, signature)) {
      throw new ApiError(400, 'Invalid Razorpay webhook signature');
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

    const payment = await Payment.findOne({ 'razorpay.orderId': razorpayOrderId });
    if (!payment) {
      this.log('webhook:payment_not_found', { razorpayOrderId });
      return;
    }

    const order = await Order.findById(payment.order);
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
