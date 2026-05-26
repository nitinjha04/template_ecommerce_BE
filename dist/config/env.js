"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isEmailEnabled = exports.isEmailConfigured = exports.getApiPublicOrigin = exports.isImageKitConfigured = exports.env = void 0;
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
const isEmailConfigured = () => Boolean(exports.env.smtp.host && exports.env.smtp.user && exports.env.smtp.pass);
exports.isEmailConfigured = isEmailConfigured;
/** Emails are off until EMAIL_ENABLED=true and SMTP vars are set. */
const isEmailEnabled = () => exports.env.emailEnabled && (0, exports.isEmailConfigured)();
exports.isEmailEnabled = isEmailEnabled;
