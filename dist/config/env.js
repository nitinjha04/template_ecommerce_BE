"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logEmailEnvDiagnostics = exports.isEmailEnabled = exports.getOrderAdminNotificationRecipients = exports.getStoreOrderAdminEmails = exports.resolveDsaGatewayId = exports.getDsaGatewayIdForDomain = exports.getEmailFromForDomain = exports.getEmailFrom = exports.isEmailConfigured = exports.isBrevoConfigured = exports.isRazorpayConfigured = exports.isDsaGatewayConfigured = exports.getPaymentReturnUrl = exports.getFrontendOrigin = exports.getApiPublicOrigin = exports.isImageKitConfigured = exports.env = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const storeDomain_1 = require("../utils/storeDomain");
dotenv_1.default.config();
const required = ["MONGODB_URI", "JWT_SECRET"];
for (const key of required) {
    if (!process.env[key]) {
        throw new Error(`Missing required environment variable: ${key}`);
    }
}
exports.env = {
    nodeEnv: process.env.NODE_ENV ?? "development",
    port: Number(process.env.PORT) || 5000,
    mongodbUri: process.env.MONGODB_URI,
    jwtSecret: process.env.JWT_SECRET,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
    corsOrigin: process.env.CORS_ORIGIN?.split(",").map((o) => o.trim()),
    dsaGateway: {
        merchantId: process.env.MERCHANT_ID ?? "",
        privateKey: process.env.PRIVATE_KEY ?? "",
        publicKey: process.env.PUBLIC_KEY ?? "",
        baseUrl: (process.env.PAYMENT_BASE_URL ?? "").replace(/\/$/, ""),
        gatewayId: process.env.GATEWAY_ID ? Number(process.env.GATEWAY_ID) : undefined,
        gatewayIds: (process.env.DSA_GATEWAY_IDS ?? "")
            .split(",")
            .map((v) => Number(String(v).trim()))
            .filter((n) => Number.isFinite(n) && n > 0),
    },
    directUpi: {
        vpa: (process.env.DIRECT_UPI_VPA ?? "").trim(),
    },
    razorpay: {
        keyId: (process.env.RAZORPAY_KEY_ID ?? "").trim(),
        keySecret: (process.env.RAZORPAY_KEY_SECRET ?? "").trim(),
        /** Optional — set from Razorpay Dashboard → Webhooks for payment.captured. */
        webhookSecret: (process.env.RAZORPAY_WEBHOOK_SECRET ?? "").trim(),
    },
    imagekit: {
        publicKey: process.env.IMAGEKIT_PUBLIC_KEY ?? "",
        privateKey: process.env.IMAGEKIT_PRIVATE_KEY ?? "",
        urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT ?? "",
    },
    seedAdmin: {
        email: process.env.SEED_ADMIN_EMAIL ?? "casaqte@gmail.com",
        password: process.env.SEED_ADMIN_PASSWORD ?? "Admin@123",
        name: process.env.SEED_ADMIN_NAME ?? "Casaq Admin",
    },
    /**
     * Email sender + admin notification inbox.
     * Kept under `smtp` for backwards compatibility with existing templates/usages,
     * but SMTP delivery is intentionally not supported anymore.
     */
    smtp: {
        from: process.env.EMAIL_FROM ??
            process.env.SMTP_FROM ??
            "Casaq <casaqte@gmail.com>",
        fromCasaq: (process.env.EMAIL_FROM_CASAQ ?? process.env.SMTP_FROM_CASAQ ?? "").trim(),
        fromArgen: (process.env.EMAIL_FROM_ARGEN ?? process.env.SMTP_FROM_ARGEN ?? "").trim(),
        adminEmail: process.env.ADMIN_EMAIL ??
            process.env.SEED_ADMIN_EMAIL ??
            "casaqte@gmail.com",
    },
    emailEnabled: process.env.EMAIL_ENABLED === "true",
    /** Sendinblue/Brevo transactional email over HTTPS (port 443). */
    brevo: {
        apiKey: (process.env.SENDINBLUE_API_KEY ??
            process.env.BREVO_API_KEY ??
            "").trim(),
    },
    frontendUrl: process.env.FRONTEND_URL?.split(",")[0]?.trim() || "http://localhost:5173",
    /** Hostname used when Origin is localhost or missing (multi-store). */
    defaultStoreDomain: (process.env.DEFAULT_STORE_DOMAIN ?? "dulhaniya.vercel.app").trim().toLowerCase(),
};
const isPlaceholder = (value) => /your_|changeme|example|placeholder/i.test(value);
const isImageKitConfigured = () => {
    const { publicKey, privateKey, urlEndpoint } = exports.env.imagekit;
    if (!publicKey || !privateKey || !urlEndpoint)
        return false;
    if (isPlaceholder(publicKey) ||
        isPlaceholder(privateKey) ||
        isPlaceholder(urlEndpoint)) {
        return false;
    }
    return true;
};
exports.isImageKitConfigured = isImageKitConfigured;
const getApiPublicOrigin = () => {
    const fromEnv = process.env.API_PUBLIC_URL?.trim();
    if (fromEnv)
        return fromEnv.replace(/\/$/, "");
    return `http://localhost:${exports.env.port}`;
};
exports.getApiPublicOrigin = getApiPublicOrigin;
/** Public storefront URL used for PayPro return / success redirects. */
const getFrontendOrigin = () => (process.env.PAYMENT_RETURN_URL?.trim() || exports.env.frontendUrl).replace(/\/$/, "");
exports.getFrontendOrigin = getFrontendOrigin;
const getPaymentReturnUrl = (orderNumber, merchantOrderNo) => `${(0, exports.getFrontendOrigin)()}/payment-return?order=${encodeURIComponent(orderNumber)}&mo=${encodeURIComponent(merchantOrderNo)}`;
exports.getPaymentReturnUrl = getPaymentReturnUrl;
const isDsaGatewayConfigured = () => {
    const { merchantId, privateKey, publicKey, baseUrl } = exports.env.dsaGateway;
    return Boolean(merchantId && privateKey && publicKey && baseUrl);
};
exports.isDsaGatewayConfigured = isDsaGatewayConfigured;
const isRazorpayConfigured = () => {
    const { keyId, keySecret } = exports.env.razorpay;
    return Boolean(keyId && keySecret && !isPlaceholder(keyId) && !isPlaceholder(keySecret));
};
exports.isRazorpayConfigured = isRazorpayConfigured;
const isBrevoConfigured = () => Boolean(exports.env.brevo.apiKey);
exports.isBrevoConfigured = isBrevoConfigured;
const isEmailConfigured = () => (0, exports.isBrevoConfigured)();
exports.isEmailConfigured = isEmailConfigured;
const getEmailFrom = () => {
    return exports.env.smtp.from;
};
exports.getEmailFrom = getEmailFrom;
const getEmailFromForDomain = (domain) => {
    const normalized = domain ? (0, storeDomain_1.normalizeStoreDomain)(domain) : "";
    if (normalized === "casaq.in" && exports.env.smtp.fromCasaq)
        return exports.env.smtp.fromCasaq;
    if (normalized === "argenstyle.in" && exports.env.smtp.fromArgen)
        return exports.env.smtp.fromArgen;
    return exports.env.smtp.from;
};
exports.getEmailFromForDomain = getEmailFromForDomain;
/**
 * Per-store DSA/PayPro gateway IDs.
 * Format: domain=gatewayId;domain2=gatewayId2
 * Example: casaq.in=489819;protico.in=490009
 */
const parseStoreDsaGatewayIds = () => {
    const raw = (process.env.STORE_DSA_GATEWAY_IDS ?? "").trim();
    const map = new Map();
    if (!raw)
        return map;
    for (const entry of raw.split(";")) {
        const eqIdx = entry.indexOf("=");
        if (eqIdx <= 0)
            continue;
        const domain = (0, storeDomain_1.normalizeStoreDomain)(entry.slice(0, eqIdx));
        const id = Number(String(entry.slice(eqIdx + 1)).trim());
        if (domain && Number.isFinite(id) && id > 0) {
            map.set(domain, id);
        }
    }
    return map;
};
const storeDsaGatewayIds = parseStoreDsaGatewayIds();
/** PayPro gateway_id for a store domain (from STORE_DSA_GATEWAY_IDS). */
const getDsaGatewayIdForDomain = (domain) => {
    if (!domain)
        return undefined;
    return storeDsaGatewayIds.get((0, storeDomain_1.normalizeStoreDomain)(domain));
};
exports.getDsaGatewayIdForDomain = getDsaGatewayIdForDomain;
/**
 * Resolve which PayPro gateway_id to use for a payment create.
 * Priority: explicit request id → store domain map → GATEWAY_ID → DSA_GATEWAY_IDS[0] → legacy default.
 */
const resolveDsaGatewayId = (input) => {
    if (Number.isFinite(input?.gatewayId) &&
        input.gatewayId > 0) {
        return input.gatewayId;
    }
    const fromDomain = (0, exports.getDsaGatewayIdForDomain)(input?.storeDomain);
    if (fromDomain)
        return fromDomain;
    if (exports.env.dsaGateway.gatewayId && exports.env.dsaGateway.gatewayId > 0) {
        return exports.env.dsaGateway.gatewayId;
    }
    const list = exports.env.dsaGateway.gatewayIds ?? [];
    if (list[0] && list[0] > 0)
        return list[0];
    return 489783;
};
exports.resolveDsaGatewayId = resolveDsaGatewayId;
/**
 * Per-store "new order" notification inboxes (in addition to ADMIN_EMAIL).
 * Format: domain=email1,email2;domain2=email3
 */
const parseStoreOrderAdminEmails = () => {
    const raw = (process.env.STORE_ORDER_ADMIN_EMAILS ?? "").trim();
    const map = new Map();
    if (!raw)
        return map;
    for (const entry of raw.split(";")) {
        const eqIdx = entry.indexOf("=");
        if (eqIdx <= 0)
            continue;
        const domain = (0, storeDomain_1.normalizeStoreDomain)(entry.slice(0, eqIdx));
        const emails = entry
            .slice(eqIdx + 1)
            .split(",")
            .map((e) => e.trim().toLowerCase())
            .filter(Boolean);
        if (domain && emails.length) {
            map.set(domain, emails);
        }
    }
    return map;
};
const storeOrderAdminEmails = parseStoreOrderAdminEmails();
const getStoreOrderAdminEmails = (domain) => {
    if (!domain)
        return [];
    const normalized = (0, storeDomain_1.normalizeStoreDomain)(domain);
    return [...(storeOrderAdminEmails.get(normalized) ?? [])];
};
exports.getStoreOrderAdminEmails = getStoreOrderAdminEmails;
/** Global admin + any store-specific order notification emails (deduped). */
const getOrderAdminNotificationRecipients = (domain) => {
    const recipients = new Set();
    const globalAdmin = exports.env.smtp.adminEmail.trim().toLowerCase();
    if (globalAdmin)
        recipients.add(globalAdmin);
    for (const email of (0, exports.getStoreOrderAdminEmails)(domain)) {
        recipients.add(email);
    }
    return [...recipients];
};
exports.getOrderAdminNotificationRecipients = getOrderAdminNotificationRecipients;
/** Emails are off until EMAIL_ENABLED=true and Brevo is configured. */
const isEmailEnabled = () => exports.env.emailEnabled && (0, exports.isEmailConfigured)();
exports.isEmailEnabled = isEmailEnabled;
/** Startup / forgot-password diagnostics — never logs SMTP_PASS. */
const logEmailEnvDiagnostics = (context) => {
    console.log(`[email-env][${context}]`, {
        NODE_ENV: exports.env.nodeEnv,
        EMAIL_ENABLED_RAW: process.env.EMAIL_ENABLED ?? "(unset)",
        emailEnabledParsed: exports.env.emailEnabled,
        isRenderHost: process.env.RENDER === "true",
        emailTransport: (0, exports.isBrevoConfigured)() ? "brevo" : "none",
        isEmailConfigured: (0, exports.isEmailConfigured)(),
        isEmailEnabled: (0, exports.isEmailEnabled)(),
        BREVO_API_KEY_SET: Boolean(exports.env.brevo.apiKey),
        SENDINBLUE_API_KEY_SET: Boolean(exports.env.brevo.apiKey),
        EMAIL_FROM: exports.env.smtp.from,
        EMAIL_FROM_CASAQ: exports.env.smtp.fromCasaq,
        EMAIL_FROM_ARGEN: exports.env.smtp.fromArgen,
        ADMIN_EMAIL: exports.env.smtp.adminEmail,
        STORE_ORDER_ADMIN_EMAILS: process.env.STORE_ORDER_ADMIN_EMAILS ?? "(unset)",
        storeOrderAdminDomains: [...storeOrderAdminEmails.keys()],
    });
};
exports.logEmailEnvDiagnostics = logEmailEnvDiagnostics;
