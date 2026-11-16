import mongoose, { Document, Types } from 'mongoose';
import { OrderStatus } from '../types';
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
    phone: string;
    street: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
}
export interface IOrder extends Document {
    orderNumber: string;
    user: Types.ObjectId;
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
    createdAt: Date;
    updatedAt: Date;
}
export declare const Order: mongoose.Model<IOrder, {}, {}, {}, mongoose.Document<unknown, {}, IOrder, {}, {}> & IOrder & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=Order.model.d.ts.map