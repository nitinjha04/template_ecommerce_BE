import { IOrder } from '../models/Order.model';
import { sendViaBrevo } from '../config/brevo';
import {
  getEmailTransport,
  isRenderHost,
  logEmailStartup,
} from '../config/emailTransport';
import { getMailTransporter } from '../config/mail';
import { sendViaResend } from '../config/resend';
import {
  env,
  getEmailFrom,
  isBrevoConfigured,
  isEmailConfigured,
  isEmailEnabled,
  isResendConfigured,
  isSmtpConfigured,
  logEmailEnvDiagnostics,
} from '../config/env';
import type { IPayment } from '../models/Payment.model';
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
import { signupOtpEmail } from '../emails/signupOtpEmail';
import { signupWelcomeEmail } from '../emails/signupWelcomeEmail';
import { ApiError } from '../utils/ApiError';

type SendEmailOptions = {
  /** When true, sending is required (email enabled + SMTP configured) or an error is thrown. */
  mustDeliver?: boolean;
};

/**
 * Transactional email: Gmail SMTP (.env) locally; Brevo/Resend HTTPS on Render.
 */
export class EmailService {
  private static async sendViaSmtp(
    to: string,
    subject: string,
    html: string
  ): Promise<string | undefined> {
    const transporter = getMailTransporter();
    const sendPromise = transporter.sendMail({
      from: env.smtp.from,
      to,
      subject,
      html,
    });

    const timeoutMs = 15_000;
    const result = await Promise.race([
      sendPromise,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('SMTP send timed out')), timeoutMs)
      ),
    ]);

    return result.messageId;
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
    const from = getEmailFrom();
    console.log('[email] Attempting send:', { to, subject, transport, from });

    if (
      isRenderHost() &&
      transport === 'smtp' &&
      !isBrevoConfigured() &&
      !isResendConfigured()
    ) {
      logEmailStartup();
      throw new ApiError(
        503,
        'Email cannot be sent from this server: Gmail SMTP is blocked. Add RESEND_API_KEY and RESEND_FROM to Render environment variables.'
      );
    }

    try {
      if (transport === 'brevo') {
        const result = await sendViaBrevo({ to, subject, html });
        console.log(
          `[email] Sent via Brevo: "${subject}" → ${to} (id: ${result.messageId})`
        );
        return;
      }

      if (transport === 'resend') {
        const result = await sendViaResend({ to, subject, html });
        console.log(
          `[email] Sent via Resend: "${subject}" → ${to} (id: ${result.id})`
        );
        return;
      }

      if (isSmtpConfigured()) {
        const messageId = await this.sendViaSmtp(to, subject, html);
        console.log(
          `[email] Sent via SMTP: "${subject}" → ${to}${
            messageId ? ` (id: ${messageId})` : ''
          }`
        );
        return;
      }

      throw new Error('No email transport configured');
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      console.error(`[email] Failed to send "${subject}" → ${to}:`, detail);

      if (
        isRenderHost() &&
        isSmtpConfigured() &&
        /timeout|ETIMEDOUT/i.test(detail)
      ) {
        if (isResendConfigured()) {
          try {
            const result = await sendViaResend({ to, subject, html });
            console.log(
              `[email] Sent via Resend (SMTP fallback): "${subject}" → ${to} (id: ${result.id})`
            );
            return;
          } catch (resendErr) {
            console.error('[email] Resend fallback failed:', resendErr);
          }
        }
        if (isBrevoConfigured()) {
          try {
            await sendViaBrevo({ to, subject, html });
            console.log(
              `[email] Sent via Brevo (SMTP fallback): "${subject}" → ${to}`
            );
            return;
          } catch (brevoErr) {
            console.error('[email] Brevo fallback failed:', brevoErr);
          }
        }
        console.error(
          '[email] Hint: Render blocks Gmail SMTP. Set RESEND_API_KEY + RESEND_FROM on Render.'
        );
      }

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
    const { subject, html } = signupWelcomeEmail(name, env.frontendUrl);
    await this.send(to, subject, html, { mustDeliver: isEmailEnabled() });
  }

  static async sendPasswordChangedEmail(to: string, name: string): Promise<void> {
    const { subject, html } = passwordChangedEmail(name);
    await this.send(to, subject, html, { mustDeliver: isEmailEnabled() });
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
    console.log('[email] sendPasswordResetOtp called:', {
      to,
      mustDeliver: isEmailEnabled(),
    });
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
