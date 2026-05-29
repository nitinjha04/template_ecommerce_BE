import { env } from './env';
import { parseEmailFrom } from '../utils/parseEmailFrom';

type ResendSendParams = {
  to: string;
  subject: string;
  html: string;
};

type ResendSuccess = { id: string };

/**
 * Send mail over HTTPS (port 443). Use on Render free tier — SMTP 587/465 is blocked.
 * @see https://resend.com/docs/api-reference/emails/send-email
 */
export const sendViaResend = async ({
  to,
  subject,
  html,
}: ResendSendParams): Promise<ResendSuccess> => {
  const parsed = parseEmailFrom(env.resend.from || env.smtp.from);
  const from = parsed.name
    ? `${parsed.name} <${parsed.email}>`
    : parsed.email;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.resend.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      html,
    }),
  });

  const body = (await response.json().catch(() => ({}))) as {
    id?: string;
    message?: string;
    name?: string;
  };

  if (!response.ok) {
    const detail = body.message ?? body.name ?? response.statusText;
    console.error('[email] Resend API error:', {
      status: response.status,
      from,
      to,
      detail,
    });
    throw new Error(`Resend API ${response.status}: ${detail}`);
  }

  if (!body.id) {
    throw new Error('Resend API returned no message id');
  }

  return { id: body.id };
};
