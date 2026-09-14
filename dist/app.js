"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const path_1 = __importDefault(require("path"));
const env_1 = require("./config/env");
const store_context_1 = require("./context/store.context");
const error_middleware_1 = require("./middleware/error.middleware");
const routes_1 = __importDefault(require("./routes"));
const app = (0, express_1.default)();
const uploadsDir = path_1.default.join(process.cwd(), "uploads");
const allowedOrigins = env_1.env.corsOrigin ?? [];
app.use((0, helmet_1.default)({
    crossOriginResourcePolicy: { policy: "cross-origin" },
}));
app.use((0, cors_1.default)({
    origin: function (origin, callback) {
        if (!origin)
            return callback(null, true);
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
}));
app.use((0, morgan_1.default)(env_1.env.nodeEnv === "development" ? "dev" : "combined"));
app.use(express_1.default.json({
    limit: "10mb",
    verify: (req, _res, buf) => {
        // Webhook signatures must be verified against the raw body.
        if (req.url?.includes("/payments/razorpay/webhook") ||
            req.url?.includes("/payments/cashfree/webhook")) {
            req.rawBody = buf;
        }
    },
}));
app.use(express_1.default.urlencoded({ extended: true }));
app.use("/uploads", express_1.default.static(uploadsDir, {
    maxAge: env_1.env.nodeEnv === "production" ? "7d" : 0,
}));
/**
 * Fully public probe — registered on the app (not the API router) so it never
 * hits store resolution or auth. No headers required.
 * GET /api/v1/payments/methods
 */
app.get("/api/v1/payments/methods", (_req, res) => {
    const storeDomain = (0, store_context_1.getStoreContext)()?.storeDomain;
    const rzpCreds = (0, env_1.resolveRazorpayCredentials)(storeDomain);
    const cfCreds = (0, env_1.resolveCashfreeCredentials)(storeDomain);
    const razorpay = Boolean(rzpCreds) || (0, env_1.isRazorpayConfigured)();
    const cashfree = Boolean(cfCreds) || (0, env_1.isCashfreeConfigured)();
    const keyId = rzpCreds?.keyId ?? ((0, env_1.isRazorpayConfigured)() ? env_1.env.razorpay.keyId : undefined);
    const appId = cfCreds?.appId ?? ((0, env_1.isCashfreeConfigured)() ? env_1.env.cashfree.appId : undefined);
    res.status(200).json({
        success: true,
        message: "Payment methods",
        data: {
            razorpay,
            ...(keyId ? { keyId } : {}),
            ...(keyId ? { keyIdPrefix: `${String(keyId).slice(0, 6)}…` } : {}),
            cashfree,
            ...(appId ? { appId } : {}),
            ...(appId ? { appIdPrefix: `${String(appId).slice(0, 6)}…` } : {}),
            ...(cashfree
                ? { cashfreeEnv: cfCreds?.env ?? env_1.env.cashfree.env }
                : {}),
            ...(storeDomain ? { storeDomain } : {}),
        },
    });
});
app.use("/api/v1", routes_1.default);
app.use(error_middleware_1.notFound);
app.use(error_middleware_1.errorHandler);
exports.default = app;
