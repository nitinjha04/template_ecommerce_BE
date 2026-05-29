import { IOrder } from '../models/Order.model';
import { getMailTransporter } from '../config/mail';
import { env, isEmailConfigured, isEmailEnabled } from '../config/env';
import type { IPayment } from '../models/Payment.model';
import {
  orderPaymentConfirmedAdminEmail,
  orderPaymentConfirmedBuyerEmail,
  orderPlacedAdminEmail,
  orderPlacedBuyerEmail,
  orderStatusUpdatedEmail,
} from '../emails/orderEmailTemplates';
import { passwordResetEmail } from '../emails/passwordResetEmail';
import { passwordResetOtpEmail } from '../emails/passwordResetOtpEmail';
import { signupOtpEmail } from '../emails/signupOtpEmail';
import { ApiError } from '../utils/ApiError';

type SendEmailOptions = {
  /** When true, sending is required (email enabled + SMTP configured) or an error is thrown. */
  mustDeliver?: boolean;
};

/**
 * Order email notifications via SMTP (Nodemailer).
 *
 * Set EMAIL_ENABLED=true and configure SMTP in .env to send mail.
 */
export class EmailService {
  private static async send(
    to: string,
    subject: string,
    html: string,
    options: SendEmailOptions = {}
  ): Promise<void> {
    const { mustDeliver = false } = options;
    const canSend = isEmailEnabled() && isEmailConfigured();

    if (!canSend) {
      if (mustDeliver) {
        throw new ApiError(
          503,
          'Email service is not configured. Please contact support or try again later.'
        );
      }
      return;
    }

    try {
      const transporter = getMailTransporter();
      const result = await transporter.sendMail({
        from: env.smtp.from,
        to,
        subject,
        html,
      });

      console.log(
        `[email] Sent successfully: "${subject}" → ${to}${
          result.messageId ? ` (id: ${result.messageId})` : ''
        }`
      );
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      console.error(`[email] Failed to send "${subject}" → ${to}:`, detail);

      throw new ApiError(
        502,
        'Failed to send email. Please check your email address and try again.'
      );
    }
  }

  /** Buyer + admin notification after online payment is confirmed. */
  static async sendOrderPaymentConfirmedEmails(
    order: IOrder,
    payment: IPayment
  ): Promise<void> {
    const buyer = orderPaymentConfirmedBuyerEmail(order, payment);
    await this.send(order.email, buyer.subject, buyer.html, {
      mustDeliver: isEmailEnabled(),
    });

    const admin = orderPaymentConfirmedAdminEmail(order, payment);
    await this.send(env.smtp.adminEmail, admin.subject, admin.html, {
      mustDeliver: isEmailEnabled(),
    });
  }

  /** Buyer + admin notification when an order is placed. */
  static async sendOrderPlacedEmails(order: IOrder): Promise<void> {
    const buyer = orderPlacedBuyerEmail(order);
    await this.send(order.email, buyer.subject, buyer.html, { mustDeliver: true });

    const admin = orderPlacedAdminEmail(order);
    await this.send(env.smtp.adminEmail, admin.subject, admin.html, {
      mustDeliver: true,
    });
  }

  /** Buyer notification when order status changes. */
  static async sendOrderStatusUpdatedEmail(
    order: IOrder,
    previousStatus: string
  ): Promise<void> {
    const { subject, html } = orderStatusUpdatedEmail(order, previousStatus);
    await this.send(order.email, subject, html, { mustDeliver: true });
  }

  static async sendPasswordResetEmail(
    to: string,
    name: string,
    resetUrl: string
  ): Promise<void> {
    const { subject, html } = passwordResetEmail(resetUrl, name);
    await this.send(to, subject, html, { mustDeliver: isEmailEnabled() });
  }

  static async sendPasswordResetOtp(
    to: string,
    name: string,
    otp: string
  ): Promise<void> {
    const { subject, html } = passwordResetOtpEmail(otp, name);
    await this.send(to, subject, html, { mustDeliver: isEmailEnabled() });
  }

  static async sendSignupOtp(
    to: string,
    name: string,
    otp: string
  ): Promise<void> {
    const { subject, html } = signupOtpEmail(otp, name);
    await this.send(to, subject, html, { mustDeliver: isEmailEnabled() });
  }
}
