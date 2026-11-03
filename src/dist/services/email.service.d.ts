import { IOrder } from '../models/Order.model';
/**
 * Order email notifications via SMTP (Nodemailer).
 *
 * Disabled by default — set EMAIL_ENABLED=true and configure SMTP in .env,
 * then uncomment the calls in order.service.ts.
 */
export declare class EmailService {
    private static send;
    /** Buyer + admin notification when an order is placed. */
    static sendOrderPlacedEmails(order: IOrder): Promise<void>;
    /** Buyer notification when order status changes. */
    static sendOrderStatusUpdatedEmail(order: IOrder, previousStatus: string): Promise<void>;
}
//# sourceMappingURL=email.service.d.ts.map