import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import { env, isCashfreeConfigured, isPayuConfigured, isRazorpayConfigured, resolveCashfreeCredentials, resolvePayuCredentials, resolveRazorpayCredentials } from "./config/env";
import { getStoreContext } from "./context/store.context";
import { errorHandler, notFound } from "./middleware/error.middleware";
import routes from "./routes";

const app = express();
const uploadsDir = path.join(process.cwd(), "uploads");
const allowedOrigins = env.corsOrigin ?? [];

/** Browser return + gateway webhooks must never fail CORS (PayU/Razorpay/etc.). */
const isPaymentGatewayPath = (url = ""): boolean =>
  /\/payments\/payu\/(return|webhook)/.test(url) ||
  /\/payments\/(razorpay|cashfree)\/webhook/.test(url) ||
  /\/gateway-payments\/webhook/.test(url);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);

// Path-aware CORS: gateway callbacks always allowed; never throw (throws → JSON 500
// on top-level browser navigations like PayU surl/furl).
app.use((req, res, next) => {
  if (isPaymentGatewayPath(req.originalUrl || req.url || "")) {
    return cors({ origin: true, credentials: true })(req, res, next);
  }
  return cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(null, false);
    },
    credentials: true,
  })(req, res, next);
});
app.use(morgan(env.nodeEnv === "development" ? "dev" : "combined"));
app.use(
  express.json({
    limit: "10mb",
    verify: (req, _res, buf) => {
      // Webhook signatures must be verified against the raw body.
      if (
        req.url?.includes("/payments/razorpay/webhook") ||
        req.url?.includes("/payments/cashfree/webhook")
      ) {
        (req as express.Request & { rawBody?: Buffer }).rawBody = buf;
      }
    },
  }),
);
app.use(express.urlencoded({ extended: true }));
app.use(
  "/uploads",
  express.static(uploadsDir, {
    maxAge: env.nodeEnv === "production" ? "7d" : 0,
  }),
);

/**
 * Fully public probe — registered on the app (not the API router) so it never
 * hits store resolution or auth. No headers required.
 * GET /api/v1/payments/methods
 */
app.get("/api/v1/payments/methods", (_req, res) => {
  const storeDomain = getStoreContext()?.storeDomain;
  const rzpCreds = resolveRazorpayCredentials(storeDomain);
  const cfCreds = resolveCashfreeCredentials(storeDomain);
  const payuCreds = resolvePayuCredentials(storeDomain);
  const razorpay = Boolean(rzpCreds) || isRazorpayConfigured();
  const cashfree = Boolean(cfCreds) || isCashfreeConfigured();
  const payu = Boolean(payuCreds) || isPayuConfigured();
  const keyId = rzpCreds?.keyId ?? (isRazorpayConfigured() ? env.razorpay.keyId : undefined);
  const appId = cfCreds?.appId ?? (isCashfreeConfigured() ? env.cashfree.appId : undefined);
  const payuKey = payuCreds?.key ?? (isPayuConfigured() ? env.payu.key : undefined);
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
        ? { cashfreeEnv: cfCreds?.env ?? env.cashfree.env }
        : {}),
      payu,
      ...(payuKey ? { payuKey } : {}),
      ...(payuKey ? { payuKeyPrefix: `${String(payuKey).slice(0, 6)}…` } : {}),
      ...(payu ? { payuEnv: payuCreds?.env ?? env.payu.env } : {}),
      ...(storeDomain ? { storeDomain } : {}),
    },
  });
});

app.use("/api/v1", routes);

app.use(notFound);
app.use(errorHandler);

export default app;
