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
    adminEmail:
      process.env.ADMIN_EMAIL ??
      process.env.SEED_ADMIN_EMAIL ??
      "admin@lucidus.in",
  },
  emailEnabled: process.env.EMAIL_ENABLED === "true",
};

export const isImageKitConfigured = (): boolean =>
  Boolean(
    env.imagekit.publicKey &&
    env.imagekit.privateKey &&
    env.imagekit.urlEndpoint,
  );

export const isEmailConfigured = (): boolean =>
  Boolean(env.smtp.host && env.smtp.user && env.smtp.pass);

/** Emails are off until EMAIL_ENABLED=true and SMTP vars are set. */
export const isEmailEnabled = (): boolean =>
  env.emailEnabled && isEmailConfigured();
