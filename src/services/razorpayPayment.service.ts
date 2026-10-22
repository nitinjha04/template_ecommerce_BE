import crypto from 'crypto';
import Razorpay from 'razorpay';
import { Types } from 'mongoose';
import {
  env,
  hasStoreRazorpayMapping,
  isRazorpayConfigured,
  listStoreRazorpayDomains,
  resolveRazorpayCredentials,
  resolveRazorpayCredentialsByKeyId,
  type RazorpayCredentials,
} from '../config/env';
import { getStoreContext } from '../context/store.context';
import { Order, Payment, Store } from '../models';
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

const maskPrefix = (value: string, len = 6): string => {
  const v = String(value ?? '');
  if (!v) return '(empty)';
  if (v.length <= len) return `${v}…`;
  return `${v.slice(0, len)}…`;
};

export class RazorpayPaymentService {
  /** One Razorpay SDK client per key_id (multi-merchant). */
  private static clients = new Map<string, Razorpay>();

  private static log(step: string, details?: Record<string, unknown>) {
    if (details) {
      console.info(`[razorpay] ${step}`, details);
      return;
    }
    console.info(`[razorpay] ${step}`);
  }

  private static credsLogFields(
    creds: RazorpayCredentials,
    extra?: Record<string, unknown>
  ): Record<string, unknown> {
    return {
      keyIdPrefix: maskPrefix(creds.keyId, 6),
      keySecretPrefix: maskPrefix(creds.keySecret, 6),
      keyIdLen: creds.keyId.length,
      keySecretLen: creds.keySecret.length,
      ...extra,
    };
  }

  private static getClient(creds: RazorpayCredentials): Razorpay {
    const existing = this.clients.get(creds.keyId);
    if (existing) return existing;
    const client = new Razorpay({
      key_id: creds.keyId,
      key_secret: creds.keySecret,
    });
    this.clients.set(creds.keyId, client);
    return client;
  }

  private static async resolveStoreDomainForOrder(
    order: IOrder
  ): Promise<string | undefined> {
    const fromCtx = getStoreContext()?.storeDomain?.trim();
    if (fromCtx) return fromCtx;

    if (order.store) {
      const store = await Store.findById(order.store).select('domain').lean();
      const domain = store?.domain?.trim();
      if (domain) return domain;
    }
    return undefined;
  }

  private static async resolveCredsForOrder(
    order: IOrder,
    savedKeyId?: string
  ): Promise<{ creds: RazorpayCredentials; storeDomain?: string; source: string }> {
    if (savedKeyId) {
      const byKey = resolveRazorpayCredentialsByKeyId(savedKeyId);
      if (byKey) {
        const storeDomain = await this.resolveStoreDomainForOrder(order);
        return { creds: byKey, storeDomain, source: 'payment.keyId' };
      }
    }

    const storeDomain = await this.resolveStoreDomainForOrder(order);
    const creds = resolveRazorpayCredentials(storeDomain);
    if (!creds) {
      throw new ApiError(500, 'Razorpay is not configured for this store');
    }

    const source = hasStoreRazorpayMapping(storeDomain)
      ? 'STORE_RAZORPAY_KEYS'
      : 'RAZORPAY_KEY_ID (global fallback)';

    return { creds, storeDomain, source };
  }

  static verifyCheckoutSignature(
    orderId: string,
    paymentId: string,
    signature: string,
    keySecret: string
  ): boolean {
    const body = `${orderId}|${paymentId}`;
    const expected = crypto
      .createHmac('sha256', keySecret)
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

  static verifyWebhookSignature(
    rawBody: Buffer | string,
    signature: string,
    webhookSecret: string
  ): boolean {
    if (!webhookSecret) return false;
    const expected = crypto
      .createHmac('sha256', webhookSecret)
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

    this.log('createForOrder:start', {
      orderNumber: input.orderNumber,
      storeContext: getStoreContext()?.storeDomain ?? '(none)',
      storeRazorpayDomains: listStoreRazorpayDomains(),
    });

    const { order, payment } = await this.assertOrderAccess(
      input.orderNumber,
      input.email,
      input.phone
    );

    if (payment.status === 'Completed') {
      throw new ApiError(400, 'Order is already paid');
    }

    const { creds, storeDomain, source } = await this.resolveCredsForOrder(order);

    this.log(
      'createForOrder:using_keys',
      this.credsLogFields(creds, {
        orderNumber: order.orderNumber,
        storeDomain: storeDomain ?? '(none)',
        source,
        route: 'POST /payments/create (provider=razorpay)',
      })
    );

    // Charge override (₹1 default): development, or DEV_TEST_ORDER_AMOUNT / DEV_FORCE_ORDER_AMOUNT set.
    const orderTotal = Number(order.total) || 0;
    const chargeTotal = applyDevTestOrderTotal(orderTotal);
    const amountPaise = Math.max(100, Math.round(chargeTotal * 100));
    const isDevCharge = shouldApplyDevTestOrderAmount();

    this.log('createForOrder:amount', {
      orderNumber: order.orderNumber,
      orderTotal,
      chargeTotal,
      amountPaise,
      nodeEnv: env.nodeEnv,
      devTestCharge: isDevCharge,
    });

    const receipt = order.orderNumber.slice(0, 40);
    let rzpOrder: { id: string };
    try {
      rzpOrder = (await this.getClient(creds).orders.create({
        amount: amountPaise,
        currency: 'INR',
        receipt,
        notes: {
          orderNumber: order.orderNumber,
          storeOrderId: String(order._id),
          storeDomain: storeDomain ?? '',
          ...(isDevCharge
            ? {
                devTestCharge: 'true',
                originalOrderTotal: String(orderTotal),
              }
            : {}),
        },
      })) as { id: string };
    } catch (err) {
      this.log(
        'createForOrder:razorpay_api_error',
        this.credsLogFields(creds, {
          orderNumber: order.orderNumber,
          storeDomain: storeDomain ?? '(none)',
          error: err instanceof Error ? err.message : String(err),
        })
      );
      throw err;
    }

    await Payment.updateOne(
      { _id: payment._id },
      {
        $set: {
          provider: 'razorpay',
          method: 'Razorpay',
          status: 'Pending',
          razorpay: {
            keyId: creds.keyId,
            orderId: rzpOrder.id,
            amount: amountPaise,
            currency: 'INR',
            createResponse: rzpOrder,
          },
        },
      }
    );

    this.log(
      'createForOrder:created',
      this.credsLogFields(creds, {
        orderNumber: order.orderNumber,
        razorpayOrderId: rzpOrder.id,
        amountPaise,
        storeDomain: storeDomain ?? '(none)',
      })
    );

    return {
      keyId: creds.keyId,
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

    const { order, payment } = await this.assertOrderAccess(
      input.orderNumber,
      input.email,
      input.phone
    );

    const { creds, storeDomain, source } = await this.resolveCredsForOrder(
      order,
      payment.razorpay?.keyId
    );

    this.log(
      'verifyAndCapture:using_keys',
      this.credsLogFields(creds, {
        orderNumber: order.orderNumber,
        storeDomain: storeDomain ?? '(none)',
        source,
        route: 'POST /payments/razorpay/verify',
        savedKeyIdPrefix: maskPrefix(payment.razorpay?.keyId ?? '', 6),
      })
    );

    const valid = this.verifyCheckoutSignature(
      input.razorpay_order_id,
      input.razorpay_payment_id,
      input.razorpay_signature,
      creds.keySecret
    );
    if (!valid) {
      this.log(
        'verifyAndCapture:invalid_signature',
        this.credsLogFields(creds, {
          orderNumber: order.orderNumber,
          storeDomain: storeDomain ?? '(none)',
        })
      );
      throw new ApiError(400, 'Invalid Razorpay payment signature');
    }

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
      keyIdPrefix: maskPrefix(creds.keyId, 6),
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

    if (
      !signature ||
      !this.verifyWebhookSignature(rawBody, signature, env.razorpay.webhookSecret)
    ) {
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
      keyIdPrefix: maskPrefix(payment.razorpay?.keyId ?? '', 6),
    });
  }
}
