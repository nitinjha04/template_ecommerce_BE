import type { IOrder, IOrderPaymentInfo } from '../models/Order.model';
import type { IPayment } from '../models/Payment.model';

export type SerializedOrderPayment = {
  id: string;
  paymentNumber: string;
  status: string;
  amount: number;
  method: string;
  provider?: string;
  paidAt?: string;
  merchantOrderNo?: string;
  gatewayOrderNo?: string;
  paymentUrl?: string;
  isPaid: boolean;
};

export type SerializedOrderPaymentInfo = {
  paymentId: string;
  paymentNumber: string;
  status: string;
  amount: number;
  method: string;
  provider?: string;
  paidAt?: string;
  merchantOrderNo?: string;
  gatewayOrderNo?: string;
  utr?: string;
  gatewayStatus?: string;
  paidAmount?: number;
  isPaid: boolean;
};

export type SerializedOrder = {
  id: string;
  orderNumber: string;
  userId?: string;
  customerName: string;
  email: string;
  phone: string;
  items: IOrder['items'];
  itemCount: number;
  total: number;
  status: IOrder['status'];
  shippingAddress: IOrder['shippingAddress'];
  paymentMethod: string;
  orderNote?: string;
  paymentInfo?: SerializedOrderPaymentInfo;
  payment?: SerializedOrderPayment;
  createdAt: Date;
  updatedAt: Date;
};

const serializePaymentInfoForClient = (
  info?: IOrderPaymentInfo
): SerializedOrderPaymentInfo | undefined => {
  if (!info) return undefined;
  return {
    paymentId: String(info.paymentId),
    paymentNumber: info.paymentNumber,
    status: info.status,
    amount: info.amount,
    method: info.method,
    provider: info.provider,
    paidAt:
      info.paidAt instanceof Date
        ? info.paidAt.toISOString()
        : info.paidAt
          ? String(info.paidAt)
          : undefined,
    merchantOrderNo: info.merchantOrderNo,
    gatewayOrderNo: info.gatewayOrderNo ?? info.utr,
    utr: info.utr,
    gatewayStatus: info.gatewayStatus,
    paidAmount: info.paidAmount,
    isPaid: info.status === 'Completed',
  };
};

const paymentFromSnapshot = (
  info: IOrderPaymentInfo
): SerializedOrderPayment => ({
  id: String(info.paymentId),
  paymentNumber: info.paymentNumber,
  status: info.status,
  amount: info.amount,
  method: info.method,
  provider: info.provider,
  paidAt:
    info.paidAt instanceof Date
      ? info.paidAt.toISOString()
      : info.paidAt
        ? String(info.paidAt)
        : undefined,
  merchantOrderNo: info.merchantOrderNo,
  gatewayOrderNo: info.gatewayOrderNo ?? info.utr,
  isPaid: info.status === 'Completed',
});

const paymentFromDocument = (payment: IPayment): SerializedOrderPayment => ({
  id: String(payment._id),
  paymentNumber: payment.paymentNumber,
  status: payment.status,
  amount: payment.amount,
  method: payment.method,
  provider: payment.provider,
  paidAt: payment.paidAt?.toISOString(),
  merchantOrderNo: payment.gateway?.merchantOrderNo,
  gatewayOrderNo: payment.gateway?.gatewayOrderNo,
  paymentUrl:
    payment.status !== 'Completed' ? payment.gateway?.payUrlH5 : undefined,
  isPaid: payment.status === 'Completed',
});

export const resolveOrderPayment = (
  order: Pick<IOrder, 'paymentInfo'>,
  latestPayment?: IPayment | null
): SerializedOrderPayment | undefined => {
  const fromSnap = order.paymentInfo
    ? paymentFromSnapshot(order.paymentInfo)
    : undefined;
  const fromDoc = latestPayment ? paymentFromDocument(latestPayment) : undefined;

  if (fromSnap?.isPaid) return fromSnap;
  if (fromDoc?.isPaid) return fromDoc;
  if (fromSnap) return fromSnap;
  if (fromDoc) return fromDoc;
  return undefined;
};

export const serializeOrder = (
  order: IOrder,
  latestPayment?: IPayment | null
): SerializedOrder => {
  const raw = order.toObject ? order.toObject({ virtuals: true }) : order;
  const doc = raw as Record<string, unknown>;
  const paymentInfo = doc.paymentInfo as IOrderPaymentInfo | undefined;

  return {
    id: String(doc._id ?? doc.id),
    orderNumber: String(doc.orderNumber),
    userId: doc.user != null ? String(doc.user) : undefined,
    customerName: String(doc.customerName),
    email: String(doc.email),
    phone: String(doc.phone),
    items: doc.items as IOrder['items'],
    itemCount: Number(doc.itemCount),
    total: Number(doc.total),
    status: doc.status as IOrder['status'],
    shippingAddress: doc.shippingAddress as IOrder['shippingAddress'],
    paymentMethod: String(doc.paymentMethod),
    orderNote: doc.orderNote ? String(doc.orderNote) : undefined,
    paymentInfo: serializePaymentInfoForClient(paymentInfo),
    payment: resolveOrderPayment({ paymentInfo }, latestPayment),
    createdAt: doc.createdAt as Date,
    updatedAt: doc.updatedAt as Date,
  };
};

export const serializeLeanOrder = (
  doc: Record<string, unknown>,
  latestPayment?: IPayment | null
): SerializedOrder => {
  const paymentInfo = doc.paymentInfo as IOrderPaymentInfo | undefined;

  return {
    id: String(doc._id),
    orderNumber: String(doc.orderNumber),
    userId: doc.user != null ? String(doc.user) : undefined,
    customerName: String(doc.customerName),
    email: String(doc.email),
    phone: String(doc.phone),
    items: doc.items as IOrder['items'],
    itemCount: Number(doc.itemCount),
    total: Number(doc.total),
    status: doc.status as IOrder['status'],
    shippingAddress: doc.shippingAddress as IOrder['shippingAddress'],
    paymentMethod: String(doc.paymentMethod),
    orderNote: doc.orderNote ? String(doc.orderNote) : undefined,
    paymentInfo: serializePaymentInfoForClient(paymentInfo),
    payment: resolveOrderPayment({ paymentInfo }, latestPayment ?? undefined),
    createdAt: doc.createdAt as Date,
    updatedAt: doc.updatedAt as Date,
  };
};
