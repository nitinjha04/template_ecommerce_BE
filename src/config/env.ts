import dotenv from "dotenv";

dotenv.config();

const required = ["MONGODB_URI", "JWT_SECRET"] as const;

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT) || 5000,
  mongodbUri: process.env.MONGODB_URI!,
  jwtSecret: process.env.JWT_SECRET!,
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
  /**
   * Email sender + admin notification inbox.
   * Kept under `smtp` for backwards compatibility with existing templates/usages,
   * but SMTP delivery is intentionally not supported anymore.
   */
  smtp: {
    from:
      process.env.EMAIL_FROM ??
      process.env.SMTP_FROM ??
      "Casaq <casaqte@gmail.com>",
    adminEmail:
      process.env.ADMIN_EMAIL ??
      process.env.SEED_ADMIN_EMAIL ??
      "casaqte@gmail.com",
  },
  emailEnabled: process.env.EMAIL_ENABLED === "true",
  /** Sendinblue/Brevo transactional email over HTTPS (port 443). */
  brevo: {
    apiKey: (
      process.env.SENDINBLUE_API_KEY ??
      process.env.BREVO_API_KEY ??
      ""
    ).trim(),
  },
  frontendUrl:
    process.env.FRONTEND_URL?.split(",")[0]?.trim() || "http://localhost:5173",
  /** Hostname used when Origin is localhost or missing (multi-store). */
  defaultStoreDomain:
    (process.env.DEFAULT_STORE_DOMAIN ?? "dulhaniya.vercel.app").trim().toLowerCase(),
};

const isPlaceholder = (value: string): boolean =>
  /your_|changeme|example|placeholder/i.test(value);

export const isImageKitConfigured = (): boolean => {
  const { publicKey, privateKey, urlEndpoint } = env.imagekit;
  if (!publicKey || !privateKey || !urlEndpoint) return false;
  if (
    isPlaceholder(publicKey) ||
    isPlaceholder(privateKey) ||
    isPlaceholder(urlEndpoint)
  ) {
    return false;
  }
  return true;
};

export const getApiPublicOrigin = (): string => {
  const fromEnv = process.env.API_PUBLIC_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  return `http://localhost:${env.port}`;
};

/** Public storefront URL used for PayPro return / success redirects. */
export const getFrontendOrigin = (): string =>
  (process.env.PAYMENT_RETURN_URL?.trim() || env.frontendUrl).replace(/\/$/, "");

export const getPaymentReturnUrl = (
  orderNumber: string,
  merchantOrderNo: string
): string =>
  `${getFrontendOrigin()}/payment-return?order=${encodeURIComponent(
    orderNumber
  )}&mo=${encodeURIComponent(merchantOrderNo)}`;

export const isDsaGatewayConfigured = (): boolean => {
  const { merchantId, privateKey, publicKey, baseUrl } = env.dsaGateway;
  return Boolean(merchantId && privateKey && publicKey && baseUrl);
};

export const isBrevoConfigured = (): boolean => Boolean(env.brevo.apiKey);

export const isEmailConfigured = (): boolean =>
  isBrevoConfigured();

export const getEmailFrom = (): string => {
  return env.smtp.from;
};

/** Emails are off until EMAIL_ENABLED=true and Brevo is configured. */
export const isEmailEnabled = (): boolean =>
  env.emailEnabled && isEmailConfigured();

/** Startup / forgot-password diagnostics — never logs SMTP_PASS. */
export const logEmailEnvDiagnostics = (context: string): void => {
  console.log(`[email-env][${context}]`, {
    NODE_ENV: env.nodeEnv,
    EMAIL_ENABLED_RAW: process.env.EMAIL_ENABLED ?? "(unset)",
    emailEnabledParsed: env.emailEnabled,
    isRenderHost: process.env.RENDER === "true",
    emailTransport: isBrevoConfigured() ? "brevo" : "none",
    isEmailConfigured: isEmailConfigured(),
    isEmailEnabled: isEmailEnabled(),
    BREVO_API_KEY_SET: Boolean(env.brevo.apiKey),
    SENDINBLUE_API_KEY_SET: Boolean(env.brevo.apiKey),
    EMAIL_FROM: env.smtp.from,
    ADMIN_EMAIL: env.smtp.adminEmail,
  });
};
