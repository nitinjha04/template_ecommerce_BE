"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailService = void 0;
const brevo_1 = require("../config/brevo");
const emailTransport_1 = require("../config/emailTransport");
const env_1 = require("../config/env");
const store_context_1 = require("../context/store.context");
const orderEmailTemplates_1 = require("../emails/orderEmailTemplates");
const passwordChangedEmail_1 = require("../emails/passwordChangedEmail");
const passwordResetEmail_1 = require("../emails/passwordResetEmail");
const passwordResetOtpEmail_1 = require("../emails/passwordResetOtpEmail");
const signupOtpEmail_1 = require("../emails/signupOtpEmail");
const signupWelcomeEmail_1 = require("../emails/signupWelcomeEmail");
const ApiError_1 = require("../utils/ApiError");
/**
 * Transactional email via Brevo/Sendinblue (HTTPS API).
 */
class EmailService {
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
        const storeDomain = (0, store_context_1.getStoreContext)()?.storeDomain;
        const from = (0, env_1.getEmailFromForDomain)(storeDomain);
        console.log('[email] Attempting send:', { to, subject, transport, from, storeDomain });
        try {
            if (transport === 'brevo') {
                const result = await (0, brevo_1.sendViaBrevo)({ to, subject, html, from });
                console.log(`[email] Sent via Brevo: "${subject}" → ${to} (id: ${result.messageId})`);
                return;
            }
            throw new Error('No email transport configured');
        }
        catch (err) {
            const detail = err instanceof Error ? err.message : String(err);
            console.error(`[email] Failed to send "${subject}" → ${to}:`, detail);
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
    /** Buyer + admin notification when an order is placed (e.g. COD). */
    static async sendOrderPlacedEmails(order) {
        const buyer = (0, orderEmailTemplates_1.orderPlacedBuyerEmail)(order);
        await this.send(order.email, buyer.subject, buyer.html, {
            mustDeliver: (0, env_1.isEmailEnabled)(),
        });
        const admin = (0, orderEmailTemplates_1.orderPlacedAdminEmail)(order);
        await this.send(env_1.env.smtp.adminEmail, admin.subject, admin.html, {
            mustDeliver: (0, env_1.isEmailEnabled)(),
        });
    }
    /** Buyer notification when order status changes. */
    static async sendOrderStatusUpdatedEmail(order, previousStatus) {
        const { subject, html } = (0, orderEmailTemplates_1.orderStatusUpdatedEmail)(order, previousStatus);
        await this.send(order.email, subject, html, {
            mustDeliver: (0, env_1.isEmailEnabled)(),
        });
    }
    /** Buyer notification when an order is cancelled. */
    static async sendOrderCancelledEmail(order) {
        const { subject, html } = (0, orderEmailTemplates_1.orderCancelledEmail)(order);
        await this.send(order.email, subject, html, {
            mustDeliver: (0, env_1.isEmailEnabled)(),
        });
    }
    static async sendWelcomeEmail(to, name) {
        const { subject, html } = (0, signupWelcomeEmail_1.signupWelcomeEmail)(name, env_1.env.frontendUrl);
        await this.send(to, subject, html, { mustDeliver: (0, env_1.isEmailEnabled)() });
    }
    static async sendPasswordChangedEmail(to, name) {
        const { subject, html } = (0, passwordChangedEmail_1.passwordChangedEmail)(name);
        await this.send(to, subject, html, { mustDeliver: (0, env_1.isEmailEnabled)() });
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
