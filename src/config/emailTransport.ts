import { env, isBrevoConfigured, isResendConfigured, isSmtpConfigured } from './env';

export const isRenderHost = (): boolean => process.env.RENDER === 'true';

/**
 * When RESEND_API_KEY is set → Resend (HTTPS, works on Render free tier).
 * Otherwise Gmail SMTP locally; on Render without Resend/Brevo, SMTP will fail.
 */
export const getEmailTransport = (): 'smtp' | 'brevo' | 'resend' | 'none' => {
  const prefer = process.env.EMAIL_TRANSPORT?.trim().toLowerCase();

  if (prefer === 'resend' && isResendConfigured()) return 'resend';
  if (prefer === 'brevo' && isBrevoConfigured()) return 'brevo';
  if (prefer === 'smtp' && isSmtpConfigured()) return 'smtp';

  if (isResendConfigured()) return 'resend';
  if (isBrevoConfigured()) return 'brevo';
  if (isSmtpConfigured()) return 'smtp';
  return 'none';
};

export const logEmailStartup = (): void => {
  const transport = getEmailTransport();
  console.log(`[email] Startup: transport=${transport}, enabled=${env.emailEnabled}`);

  if (isResendConfigured()) {
    console.log(`[email] Resend from: ${env.resend.from || env.smtp.from}`);
  }

  if (isRenderHost() && transport === 'smtp') {
    console.warn(
      '[email] Render free tier blocks Gmail SMTP (ports 587/465). ' +
        'Set RESEND_API_KEY + RESEND_FROM on Render (or BREVO_API_KEY).'
    );
  }
};
