import type { IPayment } from '../models/Payment.model';
import { isPopulatedSubdoc, refToIdString } from './mongooseRefs';

export type SerializedPayment = {
  id: string;
  paymentNumber: string;
  orderId: string;
  order?: {
    orderNumber?: string;
    total?: number;
    status?: string;
  };
  userId?: string;
  method: string;
  amount: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
};

export const serializePayment = (payment: IPayment): SerializedPayment => {
  const raw = payment.toObject({ virtuals: true });
  const orderRef = raw.order as unknown;

  let orderId = refToIdString(orderRef);
  let orderSummary: SerializedPayment['order'];

  if (isPopulatedSubdoc(orderRef)) {
    orderId = refToIdString(orderRef._id ?? orderRef.id ?? orderRef);
    orderSummary = {
      orderNumber:
        typeof orderRef.orderNumber === 'string'
          ? orderRef.orderNumber
          : undefined,
      total: typeof orderRef.total === 'number' ? orderRef.total : undefined,
      status: typeof orderRef.status === 'string' ? orderRef.status : undefined,
    };
  }

  const userRef = raw.user as unknown;
  const userId = userRef != null ? refToIdString(userRef) : undefined;

  return {
    id: String(raw._id),
    paymentNumber: raw.paymentNumber,
    orderId,
    ...(orderSummary ? { order: orderSummary } : {}),
    ...(userId ? { userId } : {}),
    method: raw.method,
    amount: raw.amount,
    status: raw.status,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
};

export const serializePayments = (payments: IPayment[]): SerializedPayment[] =>
  payments.map(serializePayment);
