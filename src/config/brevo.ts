import { env } from './env';
import { parseEmailFrom } from '../utils/parseEmailFrom';
import * as SibApiV3Sdk from '@sendinblue/client';

type BrevoSendParams = {
  to: string;
  subject: string;
  html: string;
  from: string;
};

/**
 * Brevo/Sendinblue transactional API over HTTPS.
 * Ensure the sender address (EMAIL_FROM) is verified in Brevo → Senders.
 */
export const sendViaBrevo = async ({
  to,
  subject,
  html,
  from: fromRaw,
}: BrevoSendParams): Promise<{ messageId: string }> => {
  const from = parseEmailFrom(fromRaw);
  const senderEmail = from.email;
  if (!senderEmail) {
    throw new Error('EMAIL_FROM must include an email address');
  }
  const senderName = from.name || 'Casaq';

  const client = new SibApiV3Sdk.TransactionalEmailsApi();
  client.setApiKey(SibApiV3Sdk.TransactionalEmailsApiApiKeys.apiKey, env.brevo.apiKey);

  const payload = new SibApiV3Sdk.SendSmtpEmail();
  payload.sender = { name: senderName, email: senderEmail };
  payload.to = [{ email: to }];
  payload.subject = subject;
  payload.htmlContent = html;

  try {
    // SDK response shape varies by version; keep it defensive.
    const result = (await client.sendTransacEmail(payload)) as unknown as {
      messageId?: string;
      body?: { messageId?: string };
    };

    const messageId =
      result?.messageId ??
      result?.body?.messageId ??
      'ok';

    return { messageId };
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    throw new Error(`Brevo API error: ${detail}`);
  }
};
