import nodemailer, { type Transporter } from 'nodemailer';
import { env, isSmtpConfigured } from './env';

let transporter: Transporter | null = null;

/** Lazy Nodemailer transporter for SMTP (Gmail, SES, etc.). */
export const getMailTransporter = (): Transporter => {
  if (!isSmtpConfigured()) {
    throw new Error(
      'SMTP is not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS.'
    );
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.secure,
      auth: {
        user: env.smtp.user,
        pass: env.smtp.pass,
      },
    });
  }

  return transporter;
};
