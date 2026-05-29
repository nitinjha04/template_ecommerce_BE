import dns from 'node:dns';
import nodemailer, { Transporter } from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';
import { env, isSmtpConfigured } from './env';

/** Resolve SMTP host over IPv4 only (avoids ENETUNREACH on hosts without IPv6 egress). */
const smtpIpv4Lookup = (
  hostname: string,
  _options: unknown,
  callback: (err: NodeJS.ErrnoException | null, address: string, family: number) => void
) => {
  dns.lookup(hostname, { family: 4 }, callback);
};

let transporter: Transporter | null = null;

/** Port 465 = implicit TLS; 587 = STARTTLS (must not use secure: true). */
export const resolveSmtpSecure = (port: number): boolean => {
  if (port === 465) return true;
  if (port === 587) return false;
  return env.smtp.secure;
};

export const getMailTransporter = (): Transporter => {
  if (!isSmtpConfigured()) {
    throw new Error(
      'SMTP is not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS, and related vars in .env'
    );
  }

  if (!transporter) {
    const port = env.smtp.port;
    const secure = resolveSmtpSecure(port);

    const transportOptions = {
      host: env.smtp.host,
      port,
      secure,
      lookup: smtpIpv4Lookup,
      auth: {
        user: env.smtp.user,
        pass: env.smtp.pass,
      },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
      ...(port === 587 && {
        requireTLS: true,
        tls: { minVersion: 'TLSv1.2' as const },
      }),
    } as SMTPTransport.Options;

    transporter = nodemailer.createTransport(transportOptions);

    console.log(
      `[email] SMTP ready: ${env.smtp.host}:${port} (secure=${secure}, ipv4=true, user=${env.smtp.user})`
    );
  }

  return transporter;
};

/** Call after .env SMTP changes so the next send picks up new settings. */
export const resetMailTransporter = (): void => {
  transporter = null;
};
