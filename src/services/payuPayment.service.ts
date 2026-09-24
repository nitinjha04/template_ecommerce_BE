import crypto from 'crypto';
import { Types } from 'mongoose';
import {
  env,
  getApiPublicOrigin,
  getFrontendOrigin,
  hasStorePayuMapping,
  isPayuConfigured,
  listStorePayuDomains,
  resolvePayuCredentials,
  resolvePayuCredentialsByKey,
  type PayuCredentials,
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

export type PayuCreateResult = {
  key: string;
  txnid: string;
  amount: string;
  productinfo: string;
  firstname: string;
  email: string;
  phone: string;
  surl: string;
  furl: string;
  hash: string;
  udf1: string;
  udf2: string;
  actionUrl: string;
  orderNumber: string;
  env: 'test' | 'production';
};

export type PayuReturnPayload = {
  key?: string;
  txnid?: string;
  amount?: string;
  productinfo?: string;
  firstname?: string;
  email?: string;
  status?: string;
  hash?: string;
  mihpayid?: string;
  udf1?: string;
  udf2?: string;
  udf3?: string;
  udf4?: string;
  udf5?: string;
  [key: string]: unknown;
};

export type PayuVerifyInput = {
  orderNumber: string;
  txnid?: string;
  email?: string;
  phone?: string;
};

const maskPrefix = (value: string, len = 6): string => {
  const v = String(value ?? '');
  if (!v) return '(empty)';
  if (v.length <= len) return `${v}…`;
  return `${v.slice(0, len)}…`;
};

const payuActionUrl = (payuEnv: 'test' | 'production'): string =>
  payuEnv === 'test'
    ? 'https://test.payu.in/_payment'
    : 'https://secure.payu.in/_payment';

const sha512 = (value: string): string =>
  crypto.createHash('sha512').update(value).digest('hex');

/** Payment request hash: key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||SALT */
export const buildPayuPaymentHash = (input: {
  key: string;
  salt: string;
  txnid: string;
  amount: string;
  productinfo: string;
  firstname: string;
  email: string;
  udf1?: string;
  udf2?: string;
  udf3?: string;
  udf4?: string;
  udf5?: string;
}): string => {
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
    '',
    '',
    '',
    '',
    '',
    '',
    input.salt,
  ].join('|');
  return sha512(sequence);
};

/** Reverse hash from PayU callback: SALT|status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key */
export const buildPayuReverseHash = (input: {
  key: string;
  salt: string;
  status: string;
  email: string;
  firstname: string;
  productinfo: string;
  amount: string;
  txnid: string;
  udf1?: string;
  udf2?: string;
  udf3?: string;
  udf4?: string;
  udf5?: string;
}): string => {
  const sequence = [
    input.salt,
    input.status,
    '',
    '',
    '',
    '',
    '',
    '',
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

const isSuccessStatus = (status?: string): boolean => {
  const s = String(status ?? '').toLowerCase();
  return s === 'success' || s === 'captured';
};

export class PayuPaymentService {
  private static log(step: string, details?: Record<string, unknown>) {
    if (details) {
      console.info(`[payu] ${step}`, details);
      return;
    }
    console.info(`[payu] ${step}`);
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
    savedKey?: string
  ): Promise<{
    creds: PayuCredentials;
    storeDomain?: string;
    source: string;
  }> {
    if (savedKey) {
      const byKey = resolvePayuCredentialsByKey(savedKey);
      if (byKey) {
        const storeDomain = await this.resolveStoreDomainForOrder(order);
        return { creds: byKey, storeDomain, source: 'payment.key' };
      }
    }

    const storeDomain = await this.resolveStoreDomainForOrder(order);
    const creds = resolvePayuCredentials(storeDomain);
    if (!creds) {
      throw new ApiError(500, 'PayU is not configured for this store');
    }

    const source = hasStorePayuMapping(storeDomain)
      ? 'STORE_PAYU_KEYS'
      : 'PAYU_KEY (global fallback)';

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

  private static buildTxnid(orderNumber: string): string {
    const base = orderNumber.replace(/[^a-zA-Z0-9]/g, '').slice(0, 12);
    const suffix = Date.now().toString(36);
    return `${base}${suffix}`.slice(0, 25);
  }

  private static async finalizePaid(input: {
    order: IOrder;
    payment: IPayment;
    txnid: string;
    mihpayid?: string;
    status?: string;
    returnData?: unknown;
  }): Promise<void> {
    const { order, payment } = input;
    const paidAt = payment.paidAt ?? new Date();

    if (payment.status === 'Completed') {
      await PaymentFinalizationService.ensureOrderPaymentSnapshot(
        order._id as Types.ObjectId,
        payment,
        { paidAt, gatewayOrderNo: input.mihpayid || input.txnid }
      );
      return;
    }

    await Payment.updateOne(
      { _id: payment._id },
      {
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
      }
    );

    const freshPayment = await Payment.findById(payment._id);
    if (!freshPayment) return;

    await PaymentFinalizationService.ensureOrderPaymentSnapshot(
      order._id as Types.ObjectId,
      freshPayment,
      { paidAt, gatewayOrderNo: input.mihpayid || input.txnid }
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

  static async createForOrder(input: {
    orderNumber: string;
    email?: string;
    phone?: string;
    name?: string;
  }): Promise<PayuCreateResult> {
    if (!isPayuConfigured()) {
      throw new ApiError(500, 'PayU is not configured');
    }

    this.log('createForOrder:start', {
      orderNumber: input.orderNumber,
      storeContext: getStoreContext()?.storeDomain ?? '(none)',
      storePayuDomains: listStorePayuDomains(),
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
      payment.payu?.key
    );

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
    const chargeTotal = applyDevTestOrderTotal(orderTotal);
    const amount = (Math.max(1, Math.round(chargeTotal * 100) / 100)).toFixed(2);
    const isDevCharge = shouldApplyDevTestOrderAmount();

    const txnid = this.buildTxnid(order.orderNumber);
    const firstname = (
      input.name?.trim() ||
      order.customerName ||
      'Customer'
    )
      .split(/\s+/)[0]
      ?.slice(0, 60) || 'Customer';
    const email = (
      input.email?.trim().toLowerCase() ||
      order.email ||
      'customer@example.com'
    ).slice(0, 100);
    const phone = (
      input.phone?.trim() ||
      order.phone ||
      '9999999999'
    ).replace(/\D/g, '').slice(-10) || '9999999999';
    const productinfo = `Order ${order.orderNumber}`.slice(0, 100);
    const udf1 = order.orderNumber;
    const udf2 = storeDomain ?? '';

    const hash = buildPayuPaymentHash({
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

    const apiOrigin = getApiPublicOrigin();
    const surl = `${apiOrigin}/api/v1/payments/payu/return`;
    const furl = `${apiOrigin}/api/v1/payments/payu/return`;
    const actionUrl = payuActionUrl(creds.env);

    await Payment.updateOne(
      { _id: payment._id },
      {
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
              actionUrl,
              ...(isDevCharge
                ? { devTestCharge: true, originalOrderTotal: orderTotal }
                : {}),
            },
          },
        },
      }
    );

    this.log('createForOrder:created', {
      orderNumber: order.orderNumber,
      txnid,
      amount,
      keyPrefix: maskPrefix(creds.key, 6),
      storeDomain: storeDomain ?? '(none)',
      actionUrl,
      nodeEnv: env.nodeEnv,
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
      orderNumber: order.orderNumber,
      env: creds.env,
    };
  }

  /** PayU browser return (surl/furl) — verify reverse hash and redirect to storefront. */
  static async handleReturn(
    payload: PayuReturnPayload
  ): Promise<{ redirectUrl: string }> {
    const txnid = String(payload.txnid ?? '').trim();
    const status = String(payload.status ?? '').trim();
    const key = String(payload.key ?? '').trim();
    const orderNumber = String(payload.udf1 ?? '').trim();
    const storeDomainHint = String(payload.udf2 ?? '').trim();

    this.log('handleReturn:start', {
      txnid,
      status,
      orderNumber: orderNumber || '(none)',
      keyPrefix: maskPrefix(key, 6),
    });

    if (!txnid) {
      throw new ApiError(400, 'Missing PayU txnid');
    }

    let payment = await Payment.findOne({ 'payu.txnid': txnid });
    if (!payment && orderNumber) {
      const linkedOrder = await Order.findOne({ orderNumber }).select('_id');
      if (linkedOrder) {
        payment = await Payment.findOne({ order: linkedOrder._id });
      }
    }

    if (!payment) {
      throw new ApiError(404, 'Payment not found for PayU txnid');
    }

    const order = await Order.findById(payment.order);
    if (!order) {
      throw new ApiError(404, 'Order not found for PayU payment');
    }

    const storeDomain =
      storeDomainHint ||
      (await this.resolveStoreDomainForOrder(order));
    const { creds } = await this.resolveCredsForOrder(
      order,
      payment.payu?.key || key
    );

    const expectedHash = buildPayuReverseHash({
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
      this.log('handleReturn:invalid_hash', {
        txnid,
        orderNumber: order.orderNumber,
        keyPrefix: maskPrefix(creds.key, 6),
      });
      throw new ApiError(400, 'Invalid PayU response hash');
    }

    const frontend = getFrontendOrigin(storeDomain);
    const success = isSuccessStatus(status);

    if (success) {
      await this.finalizePaid({
        order,
        payment,
        txnid,
        mihpayid: payload.mihpayid
          ? String(payload.mihpayid)
          : undefined,
        status,
        returnData: payload,
      });
      this.log('handleReturn:paid', {
        orderNumber: order.orderNumber,
        txnid,
      });
      return {
        redirectUrl: `${frontend}/order-success?order=${encodeURIComponent(
          order.orderNumber
        )}`,
      };
    }

    this.log('handleReturn:not_paid', {
      orderNumber: order.orderNumber,
      txnid,
      status,
    });

    return {
      redirectUrl: `${frontend}/payment-return?order=${encodeURIComponent(
        order.orderNumber
      )}&provider=payu&txnid=${encodeURIComponent(txnid)}&s=0`,
    };
  }

  static async verifyAndCapture(input: PayuVerifyInput): Promise<{
    orderNumber: string;
    paymentId: string;
    status: 'Completed';
  }> {
    if (!isPayuConfigured()) {
      throw new ApiError(500, 'PayU is not configured');
    }

    const { order, payment } = await this.assertOrderAccess(
      input.orderNumber,
      input.email,
      input.phone
    );

    const txnid = (input.txnid || payment.payu?.txnid || '').trim();
    if (!txnid) {
      throw new ApiError(400, 'PayU txnid is required');
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
      throw new ApiError(
        400,
        'PayU payment not completed yet. Finish checkout on PayU and wait for return.'
      );
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
