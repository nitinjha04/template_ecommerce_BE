import { env, isBrevoConfigured } from './env';

export const isRenderHost = (): boolean => process.env.RENDER === 'true';

/**
 * Transactional email is sent via Brevo/Sendinblue HTTPS API.
 */
export const getEmailTransport = (): 'brevo' | 'none' => {
  const prefer = process.env.EMAIL_TRANSPORT?.trim().toLowerCase();

  if (prefer === 'brevo' && isBrevoConfigured()) return 'brevo';
  if (isBrevoConfigured()) return 'brevo';
  return 'none';
};

export const logEmailStartup = (): void => {
  const transport = getEmailTransport();
  console.log(`[email] Startup: transport=${transport}, enabled=${env.emailEnabled}`);
};
