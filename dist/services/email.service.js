"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailService = void 0;
const brevo_1 = require("../config/brevo");
const emailTransport_1 = require("../config/emailTransport");
const mail_1 = require("../config/mail");
const resend_1 = require("../config/resend");
const env_1 = require("../config/env");
const orderEmailTemplates_1 = require("../emails/orderEmailTemplates");
const passwordResetEmail_1 = require("../emails/passwordResetEmail");
const passwordResetOtpEmail_1 = require("../emails/passwordResetOtpEmail");
const signupOtpEmail_1 = require("../emails/signupOtpEmail");
const ApiError_1 = require("../utils/ApiError");
/**
 * Transactional email: Gmail SMTP (.env) locally; Brevo/Resend HTTPS on Render.
 */
class EmailService {
    static async sendViaSmtp(to, subject, html) {
        const transporter = (0, mail_1.getMailTransporter)();
        const sendPromise = transporter.sendMail({
            from: env_1.env.smtp.from,
            to,
            subject,
            html,
        });
        const timeoutMs = 15_000;
        const result = await Promise.race([
            sendPromise,
            new Promise((_, reject) => setTimeout(() => reject(new Error('SMTP send timed out')), timeoutMs)),
        ]);
        return result.messageId;
    }
    static async send(to, subject, html, options = {}) {
        const { mustDeliver = false } = options;
        const canSend = (0, env_1.isEmailEnabled)() && (0, env_1.isEmailConfigured)();
        if (!canSend) {
            console.warn('[email] Send skipped — mail not ready:', {
                to,
                subject,
                mustDeliver,
                isEmailEnabled: (0, env_1.isEmailEnabled)(),
                isEmailConfigured: (0, env_1.isEmailConfigured)(),
                EMAIL_ENABLED_RAW: process.env.EMAIL_ENABLED ?? '(unset)',
            });
            (0, env_1.logEmailEnvDiagnostics)(`send-skipped:${subject}`);
            if (mustDeliver) {
                throw new ApiError_1.ApiError(503, 'Email service is not configured. Please contact support or try again later.');
            }
            return;
        }
        const transport = (0, emailTransport_1.getEmailTransport)();
        const from = (0, env_1.getEmailFrom)();
        console.log('[email] Attempting send:', { to, subject, transport, from });
        if ((0, emailTransport_1.isRenderHost)() &&
            transport === 'smtp' &&
            !(0, env_1.isBrevoConfigured)() &&
            !(0, env_1.isResendConfigured)()) {
            (0, emailTransport_1.logEmailStartup)();
            throw new ApiError_1.ApiError(503, 'Email cannot be sent from this server: Gmail SMTP is blocked. Add RESEND_API_KEY and RESEND_FROM to Render environment variables.');
        }
        try {
            if (transport === 'brevo') {
                const result = await (0, brevo_1.sendViaBrevo)({ to, subject, html });
                console.log(`[email] Sent via Brevo: "${subject}" → ${to} (id: ${result.messageId})`);
                return;
            }
            if (transport === 'resend') {
                const result = await (0, resend_1.sendViaResend)({ to, subject, html });
                console.log(`[email] Sent via Resend: "${subject}" → ${to} (id: ${result.id})`);
                return;
            }
            if ((0, env_1.isSmtpConfigured)()) {
                const messageId = await this.sendViaSmtp(to, subject, html);
                console.log(`[email] Sent via SMTP: "${subject}" → ${to}${messageId ? ` (id: ${messageId})` : ''}`);
                return;
            }
            throw new Error('No email transport configured');
        }
        catch (err) {
            const detail = err instanceof Error ? err.message : String(err);
            console.error(`[email] Failed to send "${subject}" → ${to}:`, detail);
            if ((0, emailTransport_1.isRenderHost)() &&
                (0, env_1.isSmtpConfigured)() &&
                /timeout|ETIMEDOUT/i.test(detail)) {
                if ((0, env_1.isResendConfigured)()) {
                    try {
                        const result = await (0, resend_1.sendViaResend)({ to, subject, html });
                        console.log(`[email] Sent via Resend (SMTP fallback): "${subject}" → ${to} (id: ${result.id})`);
                        return;
                    }
                    catch (resendErr) {
                        console.error('[email] Resend fallback failed:', resendErr);
                    }
                }
                if ((0, env_1.isBrevoConfigured)()) {
                    try {
                        await (0, brevo_1.sendViaBrevo)({ to, subject, html });
                        console.log(`[email] Sent via Brevo (SMTP fallback): "${subject}" → ${to}`);
                        return;
                    }
                    catch (brevoErr) {
                        console.error('[email] Brevo fallback failed:', brevoErr);
                    }
                }
                console.error('[email] Hint: Render blocks Gmail SMTP. Set RESEND_API_KEY + RESEND_FROM on Render.');
            }
            if (err instanceof ApiError_1.ApiError)
                throw err;
            throw new ApiError_1.ApiError(502, 'Failed to send email. Please check your email address and try again.');
        }
    }
    /** Buyer + admin notification after online payment is confirmed. */
    static async sendOrderPaymentConfirmedEmails(order, payment) {
        const buyer = (0, orderEmailTemplates_1.orderPaymentConfirmedBuyerEmail)(order, payment);
        await this.send(order.email, buyer.subject, buyer.html, {
            mustDeliver: (0, env_1.isEmailEnabled)(),
        });
        const admin = (0, orderEmailTemplates_1.orderPaymentConfirmedAdminEmail)(order, payment);
        await this.send(env_1.env.smtp.adminEmail, admin.subject, admin.html, {
            mustDeliver: (0, env_1.isEmailEnabled)(),
        });
    }
    /** Buyer + admin notification when an order is placed. */
    static async sendOrderPlacedEmails(order) {
        const buyer = (0, orderEmailTemplates_1.orderPlacedBuyerEmail)(order);
        await this.send(order.email, buyer.subject, buyer.html, { mustDeliver: true });
        const admin = (0, orderEmailTemplates_1.orderPlacedAdminEmail)(order);
        await this.send(env_1.env.smtp.adminEmail, admin.subject, admin.html, {
            mustDeliver: true,
        });
    }
    /** Buyer notification when order status changes. */
    static async sendOrderStatusUpdatedEmail(order, previousStatus) {
        const { subject, html } = (0, orderEmailTemplates_1.orderStatusUpdatedEmail)(order, previousStatus);
        await this.send(order.email, subject, html, { mustDeliver: true });
    }
    static async sendPasswordResetEmail(to, name, resetUrl) {
        const { subject, html } = (0, passwordResetEmail_1.passwordResetEmail)(resetUrl, name);
        await this.send(to, subject, html, { mustDeliver: (0, env_1.isEmailEnabled)() });
    }
    static async sendPasswordResetOtp(to, name, otp) {
        console.log('[email] sendPasswordResetOtp called:', {
            to,
            mustDeliver: (0, env_1.isEmailEnabled)(),
        });
        const { subject, html } = (0, passwordResetOtpEmail_1.passwordResetOtpEmail)(otp, name);
        await this.send(to, subject, html, { mustDeliver: (0, env_1.isEmailEnabled)() });
    }
    static async sendSignupOtp(to, name, otp) {
        const { subject, html } = (0, signupOtpEmail_1.signupOtpEmail)(otp, name);
        await this.send(to, subject, html, { mustDeliver: (0, env_1.isEmailEnabled)() });
    }
}
exports.EmailService = EmailService;
