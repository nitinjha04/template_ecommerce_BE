import mongoose, { Document, Schema, Types } from 'mongoose';
import { PaymentStatus } from '../types';

export interface IPayment extends Document {
  paymentNumber: string;
  order: Types.ObjectId;
  user: Types.ObjectId;
  method: string;
  amount: number;
  status: PaymentStatus;
  createdAt: Date;
  updatedAt: Date;
}

const PAYMENT_STATUSES: PaymentStatus[] = ['Completed', 'Pending', 'Failed'];

const paymentSchema = new Schema<IPayment>(
  {
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
      required: true,
      index: true,
    },
    method: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: PAYMENT_STATUSES,
      default: 'Pending',
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc, ret: Record<string, unknown>) {
        ret.id = String(ret._id);
        ret.orderId = ret.order != null ? String(ret.order) : ret.order;
        delete ret._id;
        delete ret.__v;
        delete ret.order;
        return ret;
      },
    },
  }
);

export const Payment = mongoose.model<IPayment>('Payment', paymentSchema);
