import mongoose, { Document, Types } from 'mongoose';
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
export declare const Payment: mongoose.Model<IPayment, {}, {}, {}, mongoose.Document<unknown, {}, IPayment, {}, {}> & IPayment & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=Payment.model.d.ts.map