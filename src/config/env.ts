import dotenv from "dotenv";
import { normalizeStoreDomain } from "../utils/storeDomain";

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
    from:
      process.env.EMAIL_FROM ??
      process.env.SMTP_FROM ??
      "Casaq <casaqte@gmail.com>",
    fromCasaq:
      (process.env.EMAIL_FROM_CASAQ ?? process.env.SMTP_FROM_CASAQ ?? "").trim(),
    fromArgen:
      (process.env.EMAIL_FROM_ARGEN ?? process.env.SMTP_FROM_ARGEN ?? "").trim(),
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
const parseStoreFrontendUrls = (): ReadonlyMap<string, string> => {
  const raw = (process.env.STORE_FRONTEND_URLS ?? "").trim();
  const map = new Map<string, string>();
  if (!raw) return map;

  for (const entry of raw.split(";")) {
    const eqIdx = entry.indexOf("=");
    if (eqIdx <= 0) continue;
    const domain = normalizeStoreDomain(entry.slice(0, eqIdx));
    let origin = entry.slice(eqIdx + 1).trim().replace(/\/$/, "");
    if (!domain || !origin) continue;
    if (!/^https?:\/\//i.test(origin)) {
      origin = `https://${origin}`;
    }
    map.set(domain, origin.replace(/\/$/, ""));
  }
  return map;
};

const storeFrontendUrls = parseStoreFrontendUrls();

/**
 * Storefront origin for redirects.
 * Priority: STORE_FRONTEND_URLS[domain] → https://{domain} → PAYMENT_RETURN_URL → FRONTEND_URL
 */
export const getFrontendOrigin = (storeDomain?: string): string => {
  const normalized = storeDomain ? normalizeStoreDomain(storeDomain) : "";

  if (normalized) {
    const mapped = storeFrontendUrls.get(normalized);
    if (mapped) return mapped;

    // Real store domains → build https://domain (skip localhost / bare IPs)
    if (
      !normalized.includes("localhost") &&
      !/^\d{1,3}(\.\d{1,3}){3}$/.test(normalized)
    ) {
      return `https://${normalized}`;
    }
  }

  return (process.env.PAYMENT_RETURN_URL?.trim() || env.frontendUrl).replace(
    /\/$/,
    ""
  );
};

export const getPaymentReturnUrl = (
  orderNumber: string,
  merchantOrderNo: string,
  storeDomain?: string
): string =>
  `${getFrontendOrigin(storeDomain)}/payment-return?order=${encodeURIComponent(
    orderNumber
  )}&mo=${encodeURIComponent(merchantOrderNo)}`;

export const isDsaGatewayConfigured = (): boolean => {
  const { merchantId, privateKey, publicKey, baseUrl } = env.dsaGateway;
  return Boolean(merchantId && privateKey && publicKey && baseUrl);
};

export const isRazorpayConfigured = (): boolean => {
  const { keyId, keySecret } = env.razorpay;
  return Boolean(keyId && keySecret && !isPlaceholder(keyId) && !isPlaceholder(keySecret));
};

export const isBrevoConfigured = (): boolean => Boolean(env.brevo.apiKey);

export const isEmailConfigured = (): boolean =>
  isBrevoConfigured();

export const getEmailFrom = (): string => {
  return env.smtp.from;
};

export const getEmailFromForDomain = (domain?: string): string => {
  const normalized = domain ? normalizeStoreDomain(domain) : "";

  if (normalized === "casaq.in" && env.smtp.fromCasaq) return env.smtp.fromCasaq;
  if (normalized === "argenstyle.in" && env.smtp.fromArgen) return env.smtp.fromArgen;

  return env.smtp.from;
};

/**
 * Per-store DSA/PayPro gateway IDs.
 * Format: domain=gatewayId;domain2=gatewayId2
 * Example: casaq.in=489819;protico.in=490009
 */
const parseStoreDsaGatewayIds = (): ReadonlyMap<string, number> => {
  const raw = (process.env.STORE_DSA_GATEWAY_IDS ?? "").trim();
  const map = new Map<string, number>();
  if (!raw) return map;

  for (const entry of raw.split(";")) {
    const eqIdx = entry.indexOf("=");
    if (eqIdx <= 0) continue;
    const domain = normalizeStoreDomain(entry.slice(0, eqIdx));
    const id = Number(String(entry.slice(eqIdx + 1)).trim());
    if (domain && Number.isFinite(id) && id > 0) {
      map.set(domain, id);
    }
  }
  return map;
};

const storeDsaGatewayIds = parseStoreDsaGatewayIds();

/** PayPro gateway_id for a store domain (from STORE_DSA_GATEWAY_IDS). */
export const getDsaGatewayIdForDomain = (domain?: string): number | undefined => {
  if (!domain) return undefined;
  return storeDsaGatewayIds.get(normalizeStoreDomain(domain));
};

/**
 * Resolve which PayPro gateway_id to use for a payment create.
 * Priority: explicit request id → store domain map → GATEWAY_ID → DSA_GATEWAY_IDS[0] → legacy default.
 */
export const resolveDsaGatewayId = (input?: {
  gatewayId?: number;
  storeDomain?: string;
}): number => {
  if (
    Number.isFinite(input?.gatewayId) &&
    (input!.gatewayId as number) > 0
  ) {
    return input!.gatewayId as number;
  }

  const fromDomain = getDsaGatewayIdForDomain(input?.storeDomain);
  if (fromDomain) return fromDomain;

  if (env.dsaGateway.gatewayId && env.dsaGateway.gatewayId > 0) {
    return env.dsaGateway.gatewayId;
  }

  const list = env.dsaGateway.gatewayIds ?? [];
  if (list[0] && list[0] > 0) return list[0];

  return 489783;
};

/**
 * Per-store "new order" notification inboxes (in addition to ADMIN_EMAIL).
 * Format: domain=email1,email2;domain2=email3
 */
const parseStoreOrderAdminEmails = (): ReadonlyMap<string, readonly string[]> => {
  const raw = (process.env.STORE_ORDER_ADMIN_EMAILS ?? "").trim();
  const map = new Map<string, string[]>();
  if (!raw) return map;

  for (const entry of raw.split(";")) {
    const eqIdx = entry.indexOf("=");
    if (eqIdx <= 0) continue;
    const domain = normalizeStoreDomain(entry.slice(0, eqIdx));
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

export const getStoreOrderAdminEmails = (domain?: string): string[] => {
  if (!domain) return [];
  const normalized = normalizeStoreDomain(domain);
  return [...(storeOrderAdminEmails.get(normalized) ?? [])];
};

/** Global admin + any store-specific order notification emails (deduped). */
export const getOrderAdminNotificationRecipients = (domain?: string): string[] => {
  const recipients = new Set<string>();
  const globalAdmin = env.smtp.adminEmail.trim().toLowerCase();
  if (globalAdmin) recipients.add(globalAdmin);
  for (const email of getStoreOrderAdminEmails(domain)) {
    recipients.add(email);
  }
  return [...recipients];
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
    EMAIL_FROM_CASAQ: env.smtp.fromCasaq,
    EMAIL_FROM_ARGEN: env.smtp.fromArgen,
    ADMIN_EMAIL: env.smtp.adminEmail,
    STORE_ORDER_ADMIN_EMAILS: process.env.STORE_ORDER_ADMIN_EMAILS ?? "(unset)",
    storeOrderAdminDomains: [...storeOrderAdminEmails.keys()],
  });
};
