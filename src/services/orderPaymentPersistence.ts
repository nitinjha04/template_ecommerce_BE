import { Types } from 'mongoose';
import { Order, Payment } from '../models';
import type { IOrder } from '../models/Order.model';
import type { IOrderPaymentInfo } from '../models/Order.model';
import type { IPayment } from '../models/Payment.model';

export type GatewayVerifyPayload = {
  status: string;
  merchantOrderNo: string;
  utr?: string;
  orderAmount?: number;
  paymentAmount?: number;
};

/**
 * When gateway verify returns status 2: persist Payment + Order.paymentInfo immediately.
 * This is the single source of truth for My Orders UI.
 */
export async function saveOrderPaymentOnGatewaySuccess(input: {
  order: IOrder;
  payment: IPayment;
  gateway: GatewayVerifyPayload;
}): Promise<IOrderPaymentInfo> {
  const { order, payment, gateway } = input;
  const paidAt = new Date();
  const utr = gateway.utr?.trim() || undefined;
  const gatewayOrderNo = utr;
  const paidAmount =
    typeof gateway.paymentAmount === 'number'
      ? gateway.paymentAmount
      : typeof gateway.orderAmount === 'number'
        ? gateway.orderAmount
        : payment.amount;

  await Payment.updateOne(
    { _id: payment._id },
    {
      $set: {
        status: 'Completed',
        paidAt,
        ...(gatewayOrderNo ? { 'gateway.gatewayOrderNo': gatewayOrderNo } : {}),
      },
    }
  );

  const paymentInfo: IOrderPaymentInfo = {
    paymentId: payment._id as Types.ObjectId,
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

  const orderSet: Record<string, unknown> = { paymentInfo };
  if (order.status === 'Pending') {
    orderSet.status = 'Processing';
  }

  await Order.updateOne({ _id: order._id }, { $set: orderSet });

  console.info(
    `[payment] Saved paymentInfo on order ${order.orderNumber} (merchant ${gateway.merchantOrderNo}, utr ${utr ?? 'n/a'})`
  );

  return paymentInfo;
}

export function parseGatewayVerifyData(raw: unknown): GatewayVerifyPayload | null {
  if (!raw || typeof raw !== 'object') return null;
  const body = raw as { data?: Record<string, unknown> };
  const data = body.data;
  if (!data || typeof data !== 'object') return null;

  const merchantOrderNo = data.merchant_order_no ?? data.merchantOrderNo;
  const status = data.status ?? data.pay_status;
  if (merchantOrderNo == null || status == null) return null;

  return {
    status: String(status),
    merchantOrderNo: String(merchantOrderNo),
    utr: data.utr != null ? String(data.utr) : undefined,
    orderAmount:
      typeof data.order_amount === 'number'
        ? data.order_amount
        : data.order_amount != null
          ? Number(data.order_amount)
          : undefined,
    paymentAmount:
      typeof data.payment_amount === 'number'
        ? data.payment_amount
        : data.payment_amount != null
          ? Number(data.payment_amount)
          : undefined,
  };
}
