"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logEmailEnvDiagnostics = exports.isEmailEnabled = exports.isEmailConfigured = exports.isDsaGatewayConfigured = exports.getPaymentReturnUrl = exports.getFrontendOrigin = exports.getApiPublicOrigin = exports.isImageKitConfigured = exports.env = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
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
    smtp: {
        host: process.env.SMTP_HOST ?? "",
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === "true",
        user: (process.env.SMTP_USER ?? "").trim(),
        /** Gmail app passwords are 16 chars; strip spaces if copied with gaps. */
        pass: (process.env.SMTP_PASS ?? "").replace(/\s/g, ""),
        from: process.env.SMTP_FROM ?? "Casaq <casaqte@gmail.com>",
        adminEmail: process.env.ADMIN_EMAIL ??
            process.env.SEED_ADMIN_EMAIL ??
            "casaqte@gmail.com",
    },
    emailEnabled: process.env.EMAIL_ENABLED === "true",
    frontendUrl: process.env.FRONTEND_URL?.split(",")[0]?.trim() || "http://localhost:5173",
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
const isEmailConfigured = () => Boolean(exports.env.smtp.host && exports.env.smtp.user && exports.env.smtp.pass);
exports.isEmailConfigured = isEmailConfigured;
/** Emails are off until EMAIL_ENABLED=true and SMTP vars are set. */
const isEmailEnabled = () => exports.env.emailEnabled && (0, exports.isEmailConfigured)();
exports.isEmailEnabled = isEmailEnabled;
/** Startup / forgot-password diagnostics — never logs SMTP_PASS. */
const logEmailEnvDiagnostics = (context) => {
    console.log(`[email-env][${context}]`, {
        NODE_ENV: exports.env.nodeEnv,
        EMAIL_ENABLED_RAW: process.env.EMAIL_ENABLED ?? "(unset)",
        emailEnabledParsed: exports.env.emailEnabled,
        isEmailConfigured: (0, exports.isEmailConfigured)(),
        isEmailEnabled: (0, exports.isEmailEnabled)(),
        SMTP_HOST: exports.env.smtp.host || "(empty)",
        SMTP_PORT: exports.env.smtp.port,
        SMTP_SECURE: exports.env.smtp.secure,
        SMTP_USER: exports.env.smtp.user || "(empty)",
        SMTP_PASS_SET: Boolean(exports.env.smtp.pass),
        SMTP_PASS_LENGTH: exports.env.smtp.pass.length,
        SMTP_FROM: exports.env.smtp.from,
        ADMIN_EMAIL: exports.env.smtp.adminEmail,
    });
};
exports.logEmailEnvDiagnostics = logEmailEnvDiagnostics;
