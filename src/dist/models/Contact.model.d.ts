import mongoose, { Document } from 'mongoose';
export interface IContact extends Document {
    name: string;
    email: string;
    subject: string;
    message: string;
    read: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export declare const Contact: mongoose.Model<IContact, {}, {}, {}, mongoose.Document<unknown, {}, IContact, {}, {}> & IContact & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=Contact.model.d.ts.map