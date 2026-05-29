import nodemailer, { Transporter } from 'nodemailer';
import { env, isEmailConfigured } from './env';

let transporter: Transporter | null = null;

/** Port 465 = implicit TLS; 587 = STARTTLS (must not use secure: true). */
export const resolveSmtpSecure = (port: number): boolean => {
  if (port === 465) return true;
  if (port === 587) return false;
  return env.smtp.secure;
};

export const getMailTransporter = (): Transporter => {
  if (!isEmailConfigured()) {
    throw new Error(
      'SMTP is not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS, and related vars in .env'
    );
  }

  if (!transporter) {
    const port = env.smtp.port;
    const secure = resolveSmtpSecure(port);

    transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port,
      secure,
      auth: {
        user: env.smtp.user,
        pass: env.smtp.pass,
      },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
      ...(port === 587 && {
        requireTLS: true,
        tls: { minVersion: 'TLSv1.2' },
      }),
    });

    console.log(
      `[email] SMTP ready: ${env.smtp.host}:${port} (secure=${secure}, user=${env.smtp.user})`
    );
  }

  return transporter;
};

/** Call after .env SMTP changes so the next send picks up new settings. */
export const resetMailTransporter = (): void => {
  transporter = null;
};
