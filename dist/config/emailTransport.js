"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logEmailStartup = exports.getEmailTransport = exports.isRenderHost = void 0;
const env_1 = require("./env");
const isRenderHost = () => process.env.RENDER === 'true';
exports.isRenderHost = isRenderHost;
/**
 * When RESEND_API_KEY is set → Resend (HTTPS, works on Render free tier).
 * Otherwise Gmail SMTP locally; on Render without Resend/Brevo, SMTP will fail.
 */
const getEmailTransport = () => {
    const prefer = process.env.EMAIL_TRANSPORT?.trim().toLowerCase();
    if (prefer === 'resend' && (0, env_1.isResendConfigured)())
        return 'resend';
    if (prefer === 'brevo' && (0, env_1.isBrevoConfigured)())
        return 'brevo';
    if (prefer === 'smtp' && (0, env_1.isSmtpConfigured)())
        return 'smtp';
    if ((0, env_1.isResendConfigured)())
        return 'resend';
    if ((0, env_1.isBrevoConfigured)())
        return 'brevo';
    if ((0, env_1.isSmtpConfigured)())
        return 'smtp';
    return 'none';
};
exports.getEmailTransport = getEmailTransport;
const logEmailStartup = () => {
    const transport = (0, exports.getEmailTransport)();
    console.log(`[email] Startup: transport=${transport}, enabled=${env_1.env.emailEnabled}`);
    if ((0, env_1.isResendConfigured)()) {
        console.log(`[email] Resend from: ${env_1.env.resend.from || env_1.env.smtp.from}`);
    }
    if ((0, exports.isRenderHost)() && transport === 'smtp') {
        console.warn('[email] Render free tier blocks Gmail SMTP (ports 587/465). ' +
            'Set RESEND_API_KEY + RESEND_FROM on Render (or BREVO_API_KEY).');
    }
};
exports.logEmailStartup = logEmailStartup;
