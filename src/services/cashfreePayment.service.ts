import crypto from 'crypto';
import axios, { AxiosError } from 'axios';
import { Types } from 'mongoose';
import {
  env,
  getApiPublicOrigin,
  getFrontendOrigin,
  hasStoreCashfreeMapping,
  isCashfreeConfigured,
  listStoreCashfreeDomains,
  resolveCashfreeCredentials,
  resolveCashfreeCredentialsByAppId,
  type CashfreeCredentials,
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

const CF_API_VERSION = '2023-08-01';

export type CashfreeCreateResult = {
  appId: string;
  paymentSessionId: string;
  cashfreeOrderId: string;
  orderNumber: string;
  amount: number;
  currency: string;
  env: 'sandbox' | 'production';
  name?: string;
  email?: string;
  phone?: string;
};

export type CashfreeVerifyInput = {
  orderNumber: string;
  cashfree_order_id?: string;
  email?: string;
  phone?: string;
};

type CashfreeOrderEntity = {
  order_id?: string;
  order_status?: string;
  order_amount?: number;
  order_currency?: string;
  payment_session_id?: string;
  cf_order_id?: string | number;
};

type CashfreeWebhookBody = {
  type?: string;
  data?: {
    order?: {
      order_id?: string;
      order_status?: string;
      order_amount?: number;
    };
    payment?: {
      cf_payment_id?: string | number;
      payment_status?: string;
      payment_amount?: number;
    };
  };
};

const maskPrefix = (value: string, len = 6): string => {
  const v = String(value ?? '');
  if (!v) return '(empty)';
  if (v.length <= len) return `${v}…`;
  return `${v.slice(0, len)}…`;
};

const cashfreeBaseUrl = (cfEnv: 'sandbox' | 'production'): string =>
  cfEnv === 'sandbox'
    ? 'https://sandbox.cashfree.com/pg'
    : 'https://api.cashfree.com/pg';

const isPaidStatus = (status?: string): boolean => {
  const s = String(status ?? '').toUpperCase();
  return s === 'PAID' || s === 'SUCCESS' || s === 'COMPLETED';
};

export class CashfreePaymentService {
  private static log(step: string, details?: Record<string, unknown>) {
    if (details) {
      console.info(`[cashfree] ${step}`, details);
      return;
    }
    console.info(`[cashfree] ${step}`);
  }

  private static credsLogFields(
    creds: CashfreeCredentials,
    extra?: Record<string, unknown>
  ): Record<string, unknown> {
    return {
      appIdPrefix: maskPrefix(creds.appId, 6),
      secretPrefix: maskPrefix(creds.secretKey, 6),
      env: creds.env,
      ...extra,
    };
  }

  private static headers(creds: CashfreeCredentials): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'x-api-version': CF_API_VERSION,
      'x-client-id': creds.appId,
      'x-client-secret': creds.secretKey,
    };
  }

  private static async resolveStoreDomainForOrder(
    order: IOrder
  ): Promise<string | undefined> {
    const fromCtx = getStoreContext()?.storeDomain?.trim();
    if (fromCtx) return fromCtx;
    if (order.store) {
      const store = await Store.findById(order.store).select('domain').lean();
      return store?.domain?.trim() || undefined;
    }
    return undefined;
  }

  private static async resolveCredsForOrder(
    order: IOrder,
    savedAppId?: string
  ): Promise<{
    creds: CashfreeCredentials;
    storeDomain?: string;
    source: string;
  }> {
    if (savedAppId) {
      const byApp = resolveCashfreeCredentialsByAppId(savedAppId);
      if (byApp) {
        const storeDomain = await this.resolveStoreDomainForOrder(order);
        return { creds: byApp, storeDomain, source: 'payment.appId' };
      }
    }

    const storeDomain = await this.resolveStoreDomainForOrder(order);
    const creds = resolveCashfreeCredentials(storeDomain);
    if (!creds) {
      throw new ApiError(500, 'Cashfree is not configured for this store');
    }

    const source = hasStoreCashfreeMapping(storeDomain)
      ? 'STORE_CASHFREE_KEYS'
      : 'CASHFREE_APP_ID (global fallback)';

    return { creds, storeDomain, source };
  }

  private static async assertOrderAccess(
    orderNumber: string,
    email?: string,
    phone?: string
  ): Promise<{ order: IOrder; payment: IPayment }> {
    const order = await Order.findOne(
      mergeStoreFilter({ orderNumber: orderNumber.trim() })
    );
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

  private static buildCashfreeOrderId(orderNumber: string): string {
    const base = orderNumber.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 28);
    const suffix = Date.now().toString(36);
    return `${base}_${suffix}`.slice(0, 45);
  }

  private static axiosMessage(err: unknown): string {
    if (err instanceof AxiosError) {
      const data = err.response?.data as
        | { message?: string; code?: string }
        | undefined;
      return data?.message || err.message;
    }
    return err instanceof Error ? err.message : String(err);
  }

  static async createForOrder(input: {
    orderNumber: string;
    email?: string;
    phone?: string;
    name?: string;
  }): Promise<CashfreeCreateResult> {
    if (!isCashfreeConfigured()) {
      throw new ApiError(500, 'Cashfree is not configured');
    }

    this.log('createForOrder:start', {
      orderNumber: input.orderNumber,
      storeContext: getStoreContext()?.storeDomain ?? '(none)',
      storeCashfreeDomains: listStoreCashfreeDomains(),
    });

    const { order, payment } = await this.assertOrderAccess(
      input.orderNumber,
      input.email,
      input.phone
    );

    if (payment.status === 'Completed') {
      throw new ApiError(400, 'Order is already paid');
    }

    const { creds, storeDomain, source } = await this.resolveCredsForOrder(
      order,
      payment.cashfree?.appId
    );

    this.log(
      'createForOrder:using_keys',
      this.credsLogFields(creds, {
        orderNumber: order.orderNumber,
        storeDomain: storeDomain ?? '(none)',
        source,
        route: 'POST /payments/create (provider=cashfree)',
      })
    );

    const orderTotal = Number(order.total) || 0;
    const chargeTotal = applyDevTestOrderTotal(orderTotal);
    const amount = Math.max(1, Math.round(chargeTotal * 100) / 100);
    const isDevCharge = shouldApplyDevTestOrderAmount();

    const cashfreeOrderId = this.buildCashfreeOrderId(order.orderNumber);
    const customerPhone = (
      input.phone?.trim() ||
      order.phone ||
      '9999999999'
    ).replace(/\D/g, '').slice(-10);
    const customerId = String(order.user ?? order._id).replace(
      /[^a-zA-Z0-9_-]/g,
      ''
    ).slice(0, 50) || `cust_${Date.now()}`;

    const returnOrigin = getFrontendOrigin(storeDomain);
    const notifyUrl = `${getApiPublicOrigin()}/api/v1/payments/cashfree/webhook`;

    const payload = {
      order_id: cashfreeOrderId,
      order_amount: amount,
      order_currency: 'INR',
      customer_details: {
        customer_id: customerId,
        customer_name: (input.name?.trim() || order.customerName || 'Customer').slice(
          0,
          100
        ),
        customer_email: (
          input.email?.trim().toLowerCase() ||
          order.email ||
          'customer@example.com'
        ).slice(0, 100),
        customer_phone: customerPhone.length >= 10 ? customerPhone : '9999999999',
      },
      order_meta: {
        return_url: `${returnOrigin}/payment-return?order=${encodeURIComponent(
          order.orderNumber
        )}&cf_order={order_id}`,
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
      nodeEnv: env.nodeEnv,
      devTestCharge: isDevCharge,
    });

    let created: CashfreeOrderEntity;
    try {
      const { data } = await axios.post<CashfreeOrderEntity>(
        `${cashfreeBaseUrl(creds.env)}/orders`,
        payload,
        { headers: this.headers(creds), timeout: 30000 }
      );
      created = data;
    } catch (err) {
      this.log(
        'createForOrder:api_error',
        this.credsLogFields(creds, {
          orderNumber: order.orderNumber,
          error: this.axiosMessage(err),
        })
      );
      throw new ApiError(502, `Cashfree create failed: ${this.axiosMessage(err)}`);
    }

    const paymentSessionId = String(created.payment_session_id ?? '').trim();
    if (!paymentSessionId) {
      throw new ApiError(502, 'Cashfree did not return payment_session_id');
    }

    await Payment.updateOne(
      { _id: payment._id },
      {
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
      }
    );

    this.log(
      'createForOrder:created',
      this.credsLogFields(creds, {
        orderNumber: order.orderNumber,
        cashfreeOrderId: created.order_id || cashfreeOrderId,
        amount,
        storeDomain: storeDomain ?? '(none)',
      })
    );

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

  private static async fetchOrder(
    creds: CashfreeCredentials,
    cashfreeOrderId: string
  ): Promise<CashfreeOrderEntity> {
    const { data } = await axios.get<CashfreeOrderEntity>(
      `${cashfreeBaseUrl(creds.env)}/orders/${encodeURIComponent(cashfreeOrderId)}`,
      { headers: this.headers(creds), timeout: 30000 }
    );
    return data;
  }

  private static async finalizePaid(input: {
    order: IOrder;
    payment: IPayment;
    cashfreeOrderId: string;
    cashfreePaymentId?: string;
    webhookData?: unknown;
  }): Promise<void> {
    const { order, payment } = input;
    const paidAt = payment.paidAt ?? new Date();

    if (payment.status === 'Completed') {
      await PaymentFinalizationService.ensureOrderPaymentSnapshot(
        order._id as Types.ObjectId,
        payment,
        { paidAt, gatewayOrderNo: input.cashfreePaymentId || input.cashfreeOrderId }
      );
      return;
    }

    await Payment.updateOne(
      { _id: payment._id },
      {
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
      }
    );

    const freshPayment = await Payment.findById(payment._id);
    if (!freshPayment) return;

    await PaymentFinalizationService.ensureOrderPaymentSnapshot(
      order._id as Types.ObjectId,
      freshPayment,
      {
        paidAt,
        gatewayOrderNo: input.cashfreePaymentId || input.cashfreeOrderId,
      }
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

  static async verifyAndCapture(input: CashfreeVerifyInput): Promise<{
    orderNumber: string;
    paymentId: string;
    status: 'Completed';
  }> {
    if (!isCashfreeConfigured()) {
      throw new ApiError(500, 'Cashfree is not configured');
    }

    const { order, payment } = await this.assertOrderAccess(
      input.orderNumber,
      input.email,
      input.phone
    );

    const cashfreeOrderId = (
      input.cashfree_order_id ||
      payment.cashfree?.orderId ||
      ''
    ).trim();
    if (!cashfreeOrderId) {
      throw new ApiError(400, 'Cashfree order id is required');
    }

    const { creds, storeDomain, source } = await this.resolveCredsForOrder(
      order,
      payment.cashfree?.appId
    );

    this.log(
      'verifyAndCapture:using_keys',
      this.credsLogFields(creds, {
        orderNumber: order.orderNumber,
        storeDomain: storeDomain ?? '(none)',
        source,
        cashfreeOrderId,
        route: 'POST /payments/cashfree/verify',
      })
    );

    let remote: CashfreeOrderEntity;
    try {
      remote = await this.fetchOrder(creds, cashfreeOrderId);
    } catch (err) {
      throw new ApiError(
        502,
        `Cashfree verify failed: ${this.axiosMessage(err)}`
      );
    }

    if (!isPaidStatus(remote.order_status)) {
      throw new ApiError(
        400,
        `Cashfree payment not completed (status: ${remote.order_status ?? 'unknown'})`
      );
    }

    if (
      payment.cashfree?.orderId &&
      payment.cashfree.orderId !== cashfreeOrderId
    ) {
      throw new ApiError(400, 'Cashfree order does not match this store order');
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

  static verifyWebhookSignature(
    rawBody: Buffer | string,
    signature: string | undefined,
    timestamp: string | undefined,
    secretKey: string
  ): boolean {
    if (!signature || !timestamp || !secretKey) return false;
    const body =
      typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8');
    const expected = crypto
      .createHmac('sha256', secretKey)
      .update(timestamp + body)
      .digest('base64');
    try {
      return crypto.timingSafeEqual(
        Buffer.from(expected),
        Buffer.from(String(signature))
      );
    } catch {
      return false;
    }
  }

  static async handleWebhook(
    rawBody: Buffer | string,
    signature: string | undefined,
    timestamp: string | undefined,
    event: CashfreeWebhookBody
  ): Promise<void> {
    if (!isCashfreeConfigured()) {
      this.log('webhook:skipped_not_configured');
      return;
    }

    const cashfreeOrderId = event.data?.order?.order_id?.trim();
    if (!cashfreeOrderId) {
      this.log('webhook:missing_order_id', { type: event.type });
      return;
    }

    const payment = await Payment.findOne({
      'cashfree.orderId': cashfreeOrderId,
    });
    if (!payment) {
      this.log('webhook:payment_not_found', { cashfreeOrderId });
      return;
    }

    const order = await Order.findById(payment.order);
    if (!order) {
      this.log('webhook:order_not_found', { cashfreeOrderId });
      return;
    }

    const { creds } = await this.resolveCredsForOrder(
      order,
      payment.cashfree?.appId
    );

    if (
      !this.verifyWebhookSignature(rawBody, signature, timestamp, creds.secretKey)
    ) {
      throw new ApiError(400, 'Invalid Cashfree webhook signature');
    }

    const type = String(event.type ?? '').toUpperCase();
    const paymentStatus = String(
      event.data?.payment?.payment_status ?? ''
    ).toUpperCase();
    const orderStatus = String(event.data?.order?.order_status ?? '').toUpperCase();

    const success =
      type.includes('SUCCESS') ||
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
