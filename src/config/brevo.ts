import { env } from './env';
import { parseEmailFrom } from '../utils/parseEmailFrom';

type BrevoSendParams = {
  to: string;
  subject: string;
  html: string;
};

/**
 * Brevo transactional API over HTTPS (works on Render free tier).
 * Verify SMTP_USER (or sender in SMTP_FROM) under Brevo → Senders.
 */
export const sendViaBrevo = async ({
  to,
  subject,
  html,
}: BrevoSendParams): Promise<{ messageId: string }> => {
  const from = parseEmailFrom(env.smtp.from);
  const senderEmail = from.email || env.smtp.user;
  const senderName = from.name || 'Casaq';

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': env.brevo.apiKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      sender: { name: senderName, email: senderEmail },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    }),
  });

  const body = (await response.json().catch(() => ({}))) as {
    messageId?: string;
    message?: string;
    code?: string;
  };

  if (!response.ok) {
    const detail = body.message ?? body.code ?? response.statusText;
    throw new Error(`Brevo API ${response.status}: ${detail}`);
  }

  return { messageId: body.messageId ?? 'ok' };
};
