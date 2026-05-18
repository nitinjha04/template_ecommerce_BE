"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMailTransporter = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const env_1 = require("./env");
let transporter = null;
const getMailTransporter = () => {
    if (!(0, env_1.isEmailConfigured)()) {
        throw new Error('SMTP is not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS, and related vars in .env');
    }
    if (!transporter) {
        transporter = nodemailer_1.default.createTransport({
            host: env_1.env.smtp.host,
            port: env_1.env.smtp.port,
            secure: env_1.env.smtp.secure,
            auth: {
                user: env_1.env.smtp.user,
                pass: env_1.env.smtp.pass,
            },
        });
    }
    return transporter;
};
exports.getMailTransporter = getMailTransporter;
