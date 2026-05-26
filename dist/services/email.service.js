"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailService = void 0;
const mail_1 = require("../config/mail");
const env_1 = require("../config/env");
const orderEmailTemplates_1 = require("../emails/orderEmailTemplates");
const passwordResetEmail_1 = require("../emails/passwordResetEmail");
const passwordResetOtpEmail_1 = require("../emails/passwordResetOtpEmail");
const signupOtpEmail_1 = require("../emails/signupOtpEmail");
const ApiError_1 = require("../utils/ApiError");
/**
 * Order email notifications via SMTP (Nodemailer).
 *
 * Set EMAIL_ENABLED=true and configure SMTP in .env to send mail.
 */
class EmailService {
    static async send(to, subject, html, options = {}) {
        const { mustDeliver = false } = options;
        const canSend = (0, env_1.isEmailEnabled)() && (0, env_1.isEmailConfigured)();
        if (!canSend) {
            if (mustDeliver) {
                throw new ApiError_1.ApiError(503, 'Email service is not configured. Please contact support or try again later.');
            }
            return;
        }
        try {
            const transporter = (0, mail_1.getMailTransporter)();
            const result = await transporter.sendMail({
                from: env_1.env.smtp.from,
                to,
                subject,
                html,
            });
            console.log(`[email] Sent successfully: "${subject}" → ${to}${result.messageId ? ` (id: ${result.messageId})` : ''}`);
        }
        catch (err) {
            const detail = err instanceof Error ? err.message : String(err);
            console.error(`[email] Failed to send "${subject}" → ${to}:`, detail);
            throw new ApiError_1.ApiError(502, 'Failed to send email. Please check your email address and try again.');
        }
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
        const { subject, html } = (0, passwordResetOtpEmail_1.passwordResetOtpEmail)(otp, name);
        await this.send(to, subject, html, { mustDeliver: (0, env_1.isEmailEnabled)() });
    }
    static async sendSignupOtp(to, name, otp) {
        const { subject, html } = (0, signupOtpEmail_1.signupOtpEmail)(otp, name);
        await this.send(to, subject, html, { mustDeliver: (0, env_1.isEmailEnabled)() });
    }
}
exports.EmailService = EmailService;
