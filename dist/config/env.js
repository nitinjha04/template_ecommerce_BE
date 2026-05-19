"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isEmailEnabled = exports.isEmailConfigured = exports.isImageKitConfigured = exports.env = void 0;
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
    corsOrigin: process.env.CORS_ORIGIN?.split(",").map((o) => o.trim()) ?? [
        "http://localhost:5173",
        "https://template-ecommerce-fe.vercel.app",
    ],
    imagekit: {
        publicKey: process.env.IMAGEKIT_PUBLIC_KEY ?? "",
        privateKey: process.env.IMAGEKIT_PRIVATE_KEY ?? "",
        urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT ?? "",
    },
    seedAdmin: {
        email: process.env.SEED_ADMIN_EMAIL ?? "admin@lucidus.in",
        password: process.env.SEED_ADMIN_PASSWORD ?? "Admin@123",
        name: process.env.SEED_ADMIN_NAME ?? "Admin User",
    },
    smtp: {
        host: process.env.SMTP_HOST ?? "",
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === "true",
        user: process.env.SMTP_USER ?? "",
        pass: process.env.SMTP_PASS ?? "",
        from: process.env.SMTP_FROM ?? "Lucidus <noreply@lucidus.in>",
        adminEmail: process.env.ADMIN_EMAIL ??
            process.env.SEED_ADMIN_EMAIL ??
            "admin@lucidus.in",
    },
    emailEnabled: process.env.EMAIL_ENABLED === "true",
    frontendUrl: process.env.FRONTEND_URL?.split(",")[0]?.trim() ||
        "http://localhost:5173",
};
const isImageKitConfigured = () => Boolean(exports.env.imagekit.publicKey &&
    exports.env.imagekit.privateKey &&
    exports.env.imagekit.urlEndpoint);
exports.isImageKitConfigured = isImageKitConfigured;
const isEmailConfigured = () => Boolean(exports.env.smtp.host && exports.env.smtp.user && exports.env.smtp.pass);
exports.isEmailConfigured = isEmailConfigured;
/** Emails are off until EMAIL_ENABLED=true and SMTP vars are set. */
const isEmailEnabled = () => exports.env.emailEnabled && (0, exports.isEmailConfigured)();
exports.isEmailEnabled = isEmailEnabled;
