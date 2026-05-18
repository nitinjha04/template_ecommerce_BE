import nodemailer, { Transporter } from 'nodemailer';
import { env, isEmailConfigured } from './env';

let transporter: Transporter | null = null;

export const getMailTransporter = (): Transporter => {
  if (!isEmailConfigured()) {
    throw new Error(
      'SMTP is not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS, and related vars in .env'
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
