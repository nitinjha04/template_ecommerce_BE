import { env, isBrevoConfigured, isSmtpConfigured } from './env';

export type EmailTransport = 'smtp' | 'brevo' | 'none';

/**
 * Prefer SMTP (Nodemailer) on AWS / any host that allows outbound 587/465.
 * Brevo HTTPS remains an optional fallback when EMAIL_TRANSPORT=brevo
 * or SMTP is not configured.
 */
export const getEmailTransport = (): EmailTransport => {
  const prefer = process.env.EMAIL_TRANSPORT?.trim().toLowerCase();

  if (prefer === 'smtp' && isSmtpConfigured()) return 'smtp';
  if (prefer === 'brevo' && isBrevoConfigured()) return 'brevo';

  if (isSmtpConfigured()) return 'smtp';
  if (isBrevoConfigured()) return 'brevo';
  return 'none';
};

export const logEmailStartup = (): void => {
  const transport = getEmailTransport();
  console.log(
    `[email] Startup: transport=${transport}, enabled=${env.emailEnabled}, smtp=${isSmtpConfigured()}, brevo=${isBrevoConfigured()}`
  );
};
