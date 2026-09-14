import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import { env, isCashfreeConfigured, isRazorpayConfigured, resolveCashfreeCredentials, resolveRazorpayCredentials } from "./config/env";
import { getStoreContext } from "./context/store.context";
import { errorHandler, notFound } from "./middleware/error.middleware";
import routes from "./routes";

const app = express();
const uploadsDir = path.join(process.cwd(), "uploads");
const allowedOrigins = env.corsOrigin ?? [];
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  }),
);
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
  const razorpay = Boolean(rzpCreds) || isRazorpayConfigured();
  const cashfree = Boolean(cfCreds) || isCashfreeConfigured();
  const keyId = rzpCreds?.keyId ?? (isRazorpayConfigured() ? env.razorpay.keyId : undefined);
  const appId = cfCreds?.appId ?? (isCashfreeConfigured() ? env.cashfree.appId : undefined);
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
      ...(storeDomain ? { storeDomain } : {}),
    },
  });
});

app.use("/api/v1", routes);

app.use(notFound);
app.use(errorHandler);

export default app;
