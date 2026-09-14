import { OrderStatus, PaymentStatus } from '../types';
export declare const seedCustomers: {
    key: string;
    name: string;
    email: string;
    password: string;
}[];
export declare const seedContacts: {
    name: string;
    email: string;
    subject: string;
    message: string;
    read: boolean;
    createdAt: string;
}[];
export interface SeedOrderDef {
    orderNumber: string;
    userKey: string;
    customerName: string;
    email: string;
    createdAt: string;
    total: number;
    itemCount: number;
    status: OrderStatus;
    paymentMethod: string;
    lineItems: Array<{
        productName: string;
        quantity: number;
        size: string;
        color: string;
    }>;
    orderNote?: string;
    shippingAddress: {
        firstName: string;
        lastName: string;
        phone: string;
        street: string;
        city: string;
        state: string;
        country: string;
        postalCode: string;
    };
}
export declare const seedOrders: SeedOrderDef[];
export declare const seedPayments: {
    paymentNumber: string;
    orderNumber: string;
    method: string;
    amount: number;
    status: PaymentStatus;
    createdAt: string;
}[];
//# sourceMappingURL=mockData.data.d.ts.map