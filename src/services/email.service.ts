import { IOrder } from '../models/Order.model';
import { getMailTransporter } from '../config/mail';
import { env, isEmailConfigured, isEmailEnabled } from '../config/env';
import {
  orderPlacedAdminEmail,
  orderPlacedBuyerEmail,
  orderStatusUpdatedEmail,
} from '../emails/orderEmailTemplates';

/**
 * Order email notifications via SMTP (Nodemailer).
 *
 * Disabled by default — set EMAIL_ENABLED=true and configure SMTP in .env,
 * then uncomment the calls in order.service.ts.
 */
export class EmailService {
  private static async send(
    to: string,
    subject: string,
    html: string
  ): Promise<void> {
    if (!isEmailEnabled() || !isEmailConfigured()) {
      return;
    }

    const transporter = getMailTransporter();
    await transporter.sendMail({
      from: env.smtp.from,
      to,
      subject,
      html,
    });
  }

  /** Buyer + admin notification when an order is placed. */
  static async sendOrderPlacedEmails(order: IOrder): Promise<void> {
    const buyer = orderPlacedBuyerEmail(order);
    await this.send(order.email, buyer.subject, buyer.html);

    const admin = orderPlacedAdminEmail(order);
    await this.send(env.smtp.adminEmail, admin.subject, admin.html);
  }

  /** Buyer notification when order status changes. */
  static async sendOrderStatusUpdatedEmail(
    order: IOrder,
    previousStatus: string
  ): Promise<void> {
    const { subject, html } = orderStatusUpdatedEmail(order, previousStatus);
    await this.send(order.email, subject, html);
  }
}
