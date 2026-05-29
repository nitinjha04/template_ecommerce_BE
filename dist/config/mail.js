"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetMailTransporter = exports.getMailTransporter = exports.resolveSmtpSecure = void 0;
const node_dns_1 = __importDefault(require("node:dns"));
const nodemailer_1 = __importDefault(require("nodemailer"));
const env_1 = require("./env");
/** Resolve SMTP host over IPv4 only (avoids ENETUNREACH on hosts without IPv6 egress). */
const smtpIpv4Lookup = (hostname, _options, callback) => {
    node_dns_1.default.lookup(hostname, { family: 4 }, callback);
};
let transporter = null;
/** Port 465 = implicit TLS; 587 = STARTTLS (must not use secure: true). */
const resolveSmtpSecure = (port) => {
    if (port === 465)
        return true;
    if (port === 587)
        return false;
    return env_1.env.smtp.secure;
};
exports.resolveSmtpSecure = resolveSmtpSecure;
const getMailTransporter = () => {
    if (!(0, env_1.isEmailConfigured)()) {
        throw new Error('SMTP is not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS, and related vars in .env');
    }
    if (!transporter) {
        const port = env_1.env.smtp.port;
        const secure = (0, exports.resolveSmtpSecure)(port);
        const transportOptions = {
            host: env_1.env.smtp.host,
            port,
            secure,
            lookup: smtpIpv4Lookup,
            auth: {
                user: env_1.env.smtp.user,
                pass: env_1.env.smtp.pass,
            },
            connectionTimeout: 10_000,
            greetingTimeout: 10_000,
            socketTimeout: 15_000,
            ...(port === 587 && {
                requireTLS: true,
                tls: { minVersion: 'TLSv1.2' },
            }),
        };
        transporter = nodemailer_1.default.createTransport(transportOptions);
        console.log(`[email] SMTP ready: ${env_1.env.smtp.host}:${port} (secure=${secure}, ipv4=true, user=${env_1.env.smtp.user})`);
    }
    return transporter;
};
exports.getMailTransporter = getMailTransporter;
/** Call after .env SMTP changes so the next send picks up new settings. */
const resetMailTransporter = () => {
    transporter = null;
};
exports.resetMailTransporter = resetMailTransporter;
