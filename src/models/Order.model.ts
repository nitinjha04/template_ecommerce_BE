import mongoose, { Document, Schema, Types } from "mongoose";
import { OrderStatus, PaymentStatus } from "../types";

/** Snapshot written when online payment succeeds (gateway status 2). */
export interface IOrderPaymentInfo {
  paymentId: Types.ObjectId;
  paymentNumber: string;
  status: PaymentStatus;
  amount: number;
  method: string;
  provider?: string;
  paidAt: Date;
  merchantOrderNo?: string;
  gatewayOrderNo?: string;
  /** Bank/gateway UTR from verify response. */
  utr?: string;
  gatewayStatus?: string;
  paidAmount?: number;
}

export interface IOrderItem {
  product: Types.ObjectId;
  name: string;
  price: number;
  quantity: number;
  size: string;
  color: string;
  image?: string;
}

export interface IShippingAddress {
  firstName: string;
  lastName: string;
  company?: string;
  phone?: string;
  street: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
}

export interface IOrder extends Document {
  orderNumber: string;
  user?: Types.ObjectId;
  customerName: string;
  email: string;
  phone: string;
  items: IOrderItem[];
  itemCount: number;
  total: number;
  status: OrderStatus;
  shippingAddress: IShippingAddress;
  paymentMethod: string;
  orderNote?: string;
  paymentInfo?: IOrderPaymentInfo;
  createdAt: Date;
  updatedAt: Date;
}

const orderItemSchema = new Schema<IOrderItem>(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    name: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    size: { type: String, required: true },
    color: { type: String, required: true },
    image: { type: String },
  },
  { _id: false },
);

const shippingAddressSchema = new Schema<IShippingAddress>(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    company: { type: String, default: "" },
    phone: { type: String },
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    country: { type: String, required: true },
    postalCode: { type: String, required: true },
  },
  { _id: false },
);

const ORDER_STATUSES: OrderStatus[] = [
  "Pending",
  "Processing",
  "Shipped",
  "Delivered",
  "Cancelled",
];

const orderSchema = new Schema<IOrder>(
  {
    orderNumber: {
      type: String,
      unique: true,
      required: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false,
      index: true,
    },
    customerName: { type: String, required: true },
    email: { type: String, required: true, lowercase: true },
    phone: { type: String, required: true },
    items: {
      type: [orderItemSchema],
      validate: [(v: IOrderItem[]) => v.length > 0, "Order must have items"],
    },
    itemCount: { type: Number, required: true, min: 1 },
    total: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ORDER_STATUSES,
      default: "Pending",
    },
    shippingAddress: {
      type: shippingAddressSchema,
      required: true,
    },
    paymentMethod: { type: String, required: true },
    orderNote: { type: String, default: "" },
    paymentInfo: {
      type: {
        paymentId: { type: Schema.Types.ObjectId, ref: "Payment" },
        paymentNumber: { type: String },
        status: { type: String, enum: ["Completed", "Pending", "Failed"] },
        amount: { type: Number, min: 0 },
        method: { type: String },
        provider: { type: String },
        paidAt: { type: Date },
        merchantOrderNo: { type: String },
        gatewayOrderNo: { type: String },
        utr: { type: String },
        gatewayStatus: { type: String },
        paidAmount: { type: Number, min: 0 },
      },
      _id: false,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc, ret: Record<string, unknown>) {
        ret.id = String(ret._id);
        ret.userId = ret.user != null ? String(ret.user) : ret.user;
        delete ret._id;
        delete ret.__v;
        delete ret.user;
        return ret;
      },
    },
  },
);

orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ email: 1, createdAt: -1 });
orderSchema.index({ phone: 1, createdAt: -1 });
orderSchema.index({ orderNumber: 1 });

export const Order = mongoose.model<IOrder>("Order", orderSchema);
