import { PaymentStatus } from '../types';
export declare class PaymentService {
    static getAll(): Promise<(import("mongoose").Document<unknown, {}, import("../models").IPayment, {}, {}> & import("../models").IPayment & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    })[]>;
    static getMyPayments(userId: string): Promise<(import("mongoose").Document<unknown, {}, import("../models").IPayment, {}, {}> & import("../models").IPayment & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    })[]>;
    static getById(id: string, userId?: string, isAdmin?: boolean): Promise<import("mongoose").Document<unknown, {}, import("../models").IPayment, {}, {}> & import("../models").IPayment & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    static updateStatus(id: string, status: PaymentStatus): Promise<import("mongoose").Document<unknown, {}, import("../models").IPayment, {}, {}> & import("../models").IPayment & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
}
//# sourceMappingURL=payment.service.d.ts.map