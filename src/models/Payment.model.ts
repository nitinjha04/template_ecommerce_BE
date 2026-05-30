import mongoose, { Document, Schema, Types } from 'mongoose';
import { PaymentStatus } from '../types';
import { isPopulatedSubdoc, refToIdString } from '../utils/mongooseRefs';

export interface IPayment extends Document {
  store: Types.ObjectId;
  paymentNumber: string;
  order: Types.ObjectId;
  user?: Types.ObjectId;
  provider?: 'dsa_deeplink' | 'payu' | 'phonepe' | 'direct_upi';
  method: string;
  amount: number;
  status: PaymentStatus;
  /** Set when gateway reports successful payment (status 2). */
  paidAt?: Date;
  directUpi?: {
    vpa: string;
    upiLink: string;
  };
  gateway?: {
    provider: 'dsa-gateway';
    gatewayId?: number;
    merchantId?: string;
    merchantOrderNo?: string;
    gatewayOrderNo?: string;
    payUrlH5?: string;
    createResponse?: unknown;
    callbackData?: unknown;
    verifyResponse?: unknown;
    successEmailSentAt?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

const PAYMENT_STATUSES: PaymentStatus[] = ['Completed', 'Pending', 'Failed'];
const PAYMENT_PROVIDERS: NonNullable<IPayment['provider']>[] = [
  'dsa_deeplink',
  'payu',
  'phonepe',
  'direct_upi',
];

const paymentSchema = new Schema<IPayment>(
  {
    store: {
      type: Schema.Types.ObjectId,
      ref: 'Store',
      required: true,
      index: true,
    },
    paymentNumber: {
      type: String,
      unique: true,
      required: true,
    },
    order: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false,
      index: true,
    },
    provider: {
      type: String,
      enum: PAYMENT_PROVIDERS,
      required: false,
      index: true,
    },
    method: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: PAYMENT_STATUSES,
      default: 'Pending',
    },
    paidAt: { type: Date, required: false },
    directUpi: {
      vpa: { type: String, required: false },
      upiLink: { type: String, required: false },
    },
    gateway: {
      provider: { type: String, enum: ['dsa-gateway'], required: false },
      gatewayId: { type: Number, required: false },
      merchantId: { type: String, required: false },
      merchantOrderNo: { type: String, required: false, index: true },
      gatewayOrderNo: { type: String, required: false },
      payUrlH5: { type: String, required: false },
      createResponse: { type: Schema.Types.Mixed, required: false },
      callbackData: { type: Schema.Types.Mixed, required: false },
      verifyResponse: { type: Schema.Types.Mixed, required: false },
      successEmailSentAt: { type: Date, required: false },
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc, ret: Record<string, unknown>) {
        ret.id = String(ret._id);

        const orderRef = ret.order;
        if (orderRef != null) {
          if (isPopulatedSubdoc(orderRef)) {
            ret.orderId = refToIdString(
              orderRef._id ?? orderRef.id ?? orderRef
            );
            ret.order = {
              orderNumber: orderRef.orderNumber as string | undefined,
              total: orderRef.total as number | undefined,
              status: orderRef.status as string | undefined,
            };
          } else {
            ret.orderId = refToIdString(orderRef);
            delete ret.order;
          }
        }

        if (ret.user != null) {
          ret.userId = refToIdString(ret.user);
          delete ret.user;
        }

        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

export const Payment = mongoose.model<IPayment>('Payment', paymentSchema);
