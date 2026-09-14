"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendViaResend = void 0;
const env_1 = require("./env");
const parseEmailFrom_1 = require("../utils/parseEmailFrom");
/**
 * Send mail over HTTPS (port 443). Use on Render free tier — SMTP 587/465 is blocked.
 * @see https://resend.com/docs/api-reference/emails/send-email
 */
const sendViaResend = async ({ to, subject, html, }) => {
    const parsed = (0, parseEmailFrom_1.parseEmailFrom)(env_1.env.resend.from || env_1.env.smtp.from);
    const from = parsed.name
        ? `${parsed.name} <${parsed.email}>`
        : parsed.email;
    const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${env_1.env.resend.apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            from,
            to: [to],
            subject,
            html,
        }),
    });
    const body = (await response.json().catch(() => ({})));
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
exports.sendViaResend = sendViaResend;
