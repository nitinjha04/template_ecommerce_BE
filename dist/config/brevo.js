"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendViaBrevo = void 0;
const env_1 = require("./env");
const parseEmailFrom_1 = require("../utils/parseEmailFrom");
/**
 * Brevo transactional API over HTTPS (works on Render free tier).
 * Verify SMTP_USER (or sender in SMTP_FROM) under Brevo → Senders.
 */
const sendViaBrevo = async ({ to, subject, html, }) => {
    const from = (0, parseEmailFrom_1.parseEmailFrom)(env_1.env.smtp.from);
    const senderEmail = from.email || env_1.env.smtp.user;
    const senderName = from.name || 'Casaq';
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
            'api-key': env_1.env.brevo.apiKey,
            'content-type': 'application/json',
        },
        body: JSON.stringify({
            sender: { name: senderName, email: senderEmail },
            to: [{ email: to }],
            subject,
            htmlContent: html,
        }),
    });
    const body = (await response.json().catch(() => ({})));
    if (!response.ok) {
        const detail = body.message ?? body.code ?? response.statusText;
        throw new Error(`Brevo API ${response.status}: ${detail}`);
    }
    return { messageId: body.messageId ?? 'ok' };
};
exports.sendViaBrevo = sendViaBrevo;
