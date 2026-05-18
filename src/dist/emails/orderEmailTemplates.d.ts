import { IOrder } from '../models/Order.model';
export declare const orderPlacedBuyerEmail: (order: IOrder) => {
    subject: string;
    html: string;
};
export declare const orderPlacedAdminEmail: (order: IOrder) => {
    subject: string;
    html: string;
};
export declare const orderStatusUpdatedEmail: (order: IOrder, previousStatus: string) => {
    subject: string;
    html: string;
};
//# sourceMappingURL=orderEmailTemplates.d.ts.map