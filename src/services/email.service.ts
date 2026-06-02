import { IOrder } from '../models/Order.model';
import { sendViaBrevo } from '../config/brevo';
import { getEmailTransport } from '../config/emailTransport';
import {
  env,
  getEmailFromForDomain,
  isBrevoConfigured,
  isEmailConfigured,
  isEmailEnabled,
  logEmailEnvDiagnostics,
} from '../config/env';
import type { IPayment } from '../models/Payment.model';
import { getStoreContext } from '../context/store.context';
import {
  orderCancelledEmail,
  orderPaymentConfirmedAdminEmail,
  orderPaymentConfirmedBuyerEmail,
  orderPlacedAdminEmail,
  orderPlacedBuyerEmail,
  orderStatusUpdatedEmail,
} from '../emails/orderEmailTemplates';
import { passwordChangedEmail } from '../emails/passwordChangedEmail';
import { passwordResetEmail } from '../emails/passwordResetEmail';
import { passwordResetOtpEmail } from '../emails/passwordResetOtpEmail';
import { passwordResetSuccessEmail } from '../emails/passwordResetSuccessEmail';
import { signupOtpEmail } from '../emails/signupOtpEmail';
import { signupWelcomeEmail } from '../emails/signupWelcomeEmail';
import { ApiError } from '../utils/ApiError';

type SendEmailOptions = {
  /** When true, sending is required (email enabled + SMTP configured) or an error is thrown. */
  mustDeliver?: boolean;
};

/**
 * Transactional email via Brevo/Sendinblue (HTTPS API).
 */
export class EmailService {
  private static getBrandName(): string {
    const store = getStoreContext();
    return store?.storeName?.trim() || 'Casaq';
  }

  private static async send(
    to: string,
    subject: string,
    html: string,
    options: SendEmailOptions = {}
  ): Promise<void> {
    const { mustDeliver = false } = options;
    const canSend = isEmailEnabled() && isEmailConfigured();

    if (!canSend) {
      console.warn('[email] Send skipped — mail not ready:', {
        to,
        subject,
        mustDeliver,
        isEmailEnabled: isEmailEnabled(),
        isEmailConfigured: isEmailConfigured(),
        EMAIL_ENABLED_RAW: process.env.EMAIL_ENABLED ?? '(unset)',
      });
      logEmailEnvDiagnostics(`send-skipped:${subject}`);

      if (mustDeliver) {
        throw new ApiError(
          503,
          'Email service is not configured. Please contact support or try again later.'
        );
      }
      return;
    }

    const transport = getEmailTransport();
    const storeDomain = getStoreContext()?.storeDomain;
    const from = getEmailFromForDomain(storeDomain);
    console.log('[email] Attempting send:', { to, subject, transport, from, storeDomain });

    try {
      if (transport === 'brevo') {
        const result = await sendViaBrevo({ to, subject, html, from });
        console.log(
          `[email] Sent via Brevo: "${subject}" → ${to} (id: ${result.messageId})`
        );
        return;
      }

      throw new Error('No email transport configured');
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      console.error(`[email] Failed to send "${subject}" → ${to}:`, detail);

      if (err instanceof ApiError) throw err;

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

  /** Buyer + admin notification when an order is placed (e.g. COD). */
  static async sendOrderPlacedEmails(order: IOrder): Promise<void> {
    const buyer = orderPlacedBuyerEmail(order);
    await this.send(order.email, buyer.subject, buyer.html, {
      mustDeliver: isEmailEnabled(),
    });

    const admin = orderPlacedAdminEmail(order);
    await this.send(env.smtp.adminEmail, admin.subject, admin.html, {
      mustDeliver: isEmailEnabled(),
    });
  }

  /** Buyer notification when order status changes. */
  static async sendOrderStatusUpdatedEmail(
    order: IOrder,
    previousStatus: string
  ): Promise<void> {
    const { subject, html } = orderStatusUpdatedEmail(order, previousStatus);
    await this.send(order.email, subject, html, {
      mustDeliver: isEmailEnabled(),
    });
  }

  /** Buyer notification when an order is cancelled. */
  static async sendOrderCancelledEmail(order: IOrder): Promise<void> {
    const { subject, html } = orderCancelledEmail(order);
    await this.send(order.email, subject, html, {
      mustDeliver: isEmailEnabled(),
    });
  }

  static async sendWelcomeEmail(to: string, name: string): Promise<void> {
    const brandName = this.getBrandName();
    const { subject, html } = signupWelcomeEmail(name, env.frontendUrl, brandName);
    await this.send(to, subject, html, { mustDeliver: isEmailEnabled() });
  }

  static async sendPasswordChangedEmail(to: string, name: string): Promise<void> {
    const brandName = this.getBrandName();
    const { subject, html } = passwordChangedEmail(name, brandName);
    await this.send(to, subject, html, { mustDeliver: isEmailEnabled() });
  }

  static async sendPasswordResetEmail(
    to: string,
    name: string,
    resetUrl: string
  ): Promise<void> {
    const brandName = this.getBrandName();
    const { subject, html } = passwordResetEmail(resetUrl, name, brandName);
    await this.send(to, subject, html, { mustDeliver: isEmailEnabled() });
  }

  static async sendPasswordResetSuccessEmail(
    to: string,
    name: string
  ): Promise<void> {
    const brandName = this.getBrandName();
    const { subject, html } = passwordResetSuccessEmail(name, brandName);
    await this.send(to, subject, html, { mustDeliver: isEmailEnabled() });
  }

  static async sendPasswordResetOtp(
    to: string,
    name: string,
    otp: string
  ): Promise<void> {
    console.log('[email] sendPasswordResetOtp called:', {
      to,
      mustDeliver: isEmailEnabled(),
    });
    const brandName = this.getBrandName();
    const { subject, html } = passwordResetOtpEmail(otp, name, brandName);
    await this.send(to, subject, html, { mustDeliver: isEmailEnabled() });
  }

  static async sendSignupOtp(
    to: string,
    name: string,
    otp: string
  ): Promise<void> {
    const brandName = this.getBrandName();
    const { subject, html } = signupOtpEmail(otp, name, brandName);
    await this.send(to, subject, html, { mustDeliver: isEmailEnabled() });
  }
}
