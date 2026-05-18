import { Types } from 'mongoose';
import { IShippingAddress } from '../models/Order.model';
import { OrderStatus } from '../types';
interface OrderItemInput {
    productId: string;
    quantity: number;
    size: string;
    color: string;
}
interface CreateOrderInput {
    userId: string;
    customerName: string;
    email: string;
    phone: string;
    items: OrderItemInput[];
    shippingAddress: IShippingAddress;
    paymentMethod: string;
    orderNote?: string;
}
export declare class OrderService {
    static create(input: CreateOrderInput): Promise<{
        order: import("mongoose").Document<unknown, {}, import("../models").IOrder, {}, {}> & import("../models").IOrder & Required<{
            _id: Types.ObjectId;
        }> & {
            __v: number;
        };
        payment: import("mongoose").Document<unknown, {}, import("../models").IPayment, {}, {}> & import("../models").IPayment & Required<{
            _id: Types.ObjectId;
        }> & {
            __v: number;
        };
    }>;
    static getMyOrders(userId: string): Promise<(import("mongoose").Document<unknown, {}, import("../models").IOrder, {}, {}> & import("../models").IOrder & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    })[]>;
    static getAllOrders(): Promise<(import("mongoose").Document<unknown, {}, import("../models").IOrder, {}, {}> & import("../models").IOrder & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    })[]>;
    static getById(id: string, userId?: string, isAdmin?: boolean): Promise<import("mongoose").Document<unknown, {}, import("../models").IOrder, {}, {}> & import("../models").IOrder & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }>;
    static updateStatus(id: string, status: OrderStatus): Promise<import("mongoose").Document<unknown, {}, import("../models").IOrder, {}, {}> & import("../models").IOrder & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }>;
}
export {};
//# sourceMappingURL=order.service.d.ts.map