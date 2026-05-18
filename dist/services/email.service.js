"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailService = void 0;
const mail_1 = require("../config/mail");
const env_1 = require("../config/env");
const orderEmailTemplates_1 = require("../emails/orderEmailTemplates");
/**
 * Order email notifications via SMTP (Nodemailer).
 *
 * Disabled by default — set EMAIL_ENABLED=true and configure SMTP in .env,
 * then uncomment the calls in order.service.ts.
 */
class EmailService {
    static async send(to, subject, html) {
        if (!(0, env_1.isEmailEnabled)() || !(0, env_1.isEmailConfigured)()) {
            return;
        }
        const transporter = (0, mail_1.getMailTransporter)();
        await transporter.sendMail({
            from: env_1.env.smtp.from,
            to,
            subject,
            html,
        });
    }
    /** Buyer + admin notification when an order is placed. */
    static async sendOrderPlacedEmails(order) {
        const buyer = (0, orderEmailTemplates_1.orderPlacedBuyerEmail)(order);
        await this.send(order.email, buyer.subject, buyer.html);
        const admin = (0, orderEmailTemplates_1.orderPlacedAdminEmail)(order);
        await this.send(env_1.env.smtp.adminEmail, admin.subject, admin.html);
    }
    /** Buyer notification when order status changes. */
    static async sendOrderStatusUpdatedEmail(order, previousStatus) {
        const { subject, html } = (0, orderEmailTemplates_1.orderStatusUpdatedEmail)(order, previousStatus);
        await this.send(order.email, subject, html);
    }
}
exports.EmailService = EmailService;
