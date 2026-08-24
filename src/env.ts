import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]),
  APP_URL: z.url("APP_URL must be a valid absolute URL."),
  NEXTAUTH_URL: z.url("NEXTAUTH_URL must be a valid absolute URL."),
  NEXTAUTH_URL_INTERNAL: z.url("NEXTAUTH_URL_INTERNAL must be a valid absolute URL.").optional(),
  NEXT_PUBLIC_SITE_NAME: z
    .string()
    .trim()
    .min(1, "NEXT_PUBLIC_SITE_NAME cannot be empty.")
    .default("Nham Blog"),
  NEXTAUTH_SECRET: z.string().min(32, "NEXTAUTH_SECRET must be at least 32 characters."),
  DATABASE_URL: z.string().trim().min(1).optional(),
  ADMIN_EMAIL: z.email("ADMIN_EMAIL must be a valid email address.").default("admin@nham.blog"),
  ADMIN_PASSWORD: z
    .string()
    .min(8, "ADMIN_PASSWORD must be at least 8 characters.")
    .default("change-me-now"),
  ADMIN_NAME: z.string().trim().min(1, "ADMIN_NAME cannot be empty.").default("Nham Admin"),
  CLOUDINARY_CLOUD_NAME: z.string().trim().min(1).optional(),
  CLOUDINARY_API_KEY: z.string().trim().min(1).optional(),
  CLOUDINARY_API_SECRET: z.string().trim().min(1).optional(),
  NEXT_PUBLIC_FIREBASE_API_KEY: z.string().trim().min(1).optional(),
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: z.string().trim().min(1).optional(),
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: z.string().trim().min(1).optional(),
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: z.string().trim().min(1).optional(),
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: z.string().trim().min(1).optional(),
  NEXT_PUBLIC_FIREBASE_APP_ID: z.string().trim().min(1).optional(),
  NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: z
    .string()
    .trim()
    .regex(/^G-[A-Z0-9]+$/, "NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID must match GA4 format (e.g. G-XXXXXXX).")
    .optional(),
  GOOGLE_CLIENT_ID: z.string().trim().min(1).optional(),
  GOOGLE_CLIENT_SECRET: z.string().trim().min(1).optional(),
  REDIS_URL: z.preprocess(
    (value) => (typeof value === "string" && value.trim().length === 0 ? undefined : value),
    z.string().trim().min(1).optional()
  ),
  RABBITMQ_URL: z.preprocess(
    (value) => (typeof value === "string" && value.trim().length === 0 ? undefined : value),
    z.string().trim().min(1).optional()
  ),
  RESEND_API_KEY: z.string().trim().min(1).optional(),
  EMAIL_FROM: z.string().trim().min(1).optional(),
  /** Optional override for newsletter From; falls back to EMAIL_FROM. */
  NEWSLETTER_FROM: z.string().trim().min(1).optional(),
});

function formatEnvErrors(error: z.ZodError) {
  const issues = error.issues.map((issue) => {
    const path = issue.path.join(".") || "root";
    return `- ${path}: ${issue.message}`;
  });

  return [
    "Invalid environment configuration.",
    "Fix the following variables before starting the app:",
    ...issues,
    "Reference: .env.example",
  ].join("\n");
}

function parseEnv() {
  const canonicalAuthUrl = process.env.NEXTAUTH_URL ?? process.env.APP_URL;

  const parsed = envSchema.safeParse({
    NODE_ENV: process.env.NODE_ENV,
    APP_URL: process.env.APP_URL,
    NEXTAUTH_URL: canonicalAuthUrl,
    NEXTAUTH_URL_INTERNAL: process.env.NEXTAUTH_URL_INTERNAL,
    NEXT_PUBLIC_SITE_NAME: process.env.NEXT_PUBLIC_SITE_NAME,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    DATABASE_URL: process.env.DATABASE_URL,
    ADMIN_EMAIL: process.env.ADMIN_EMAIL,
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
    ADMIN_NAME: process.env.ADMIN_NAME,
    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
    NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    REDIS_URL: process.env.REDIS_URL,
    RABBITMQ_URL: process.env.RABBITMQ_URL,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    EMAIL_FROM: process.env.EMAIL_FROM,
    NEWSLETTER_FROM: process.env.NEWSLETTER_FROM,
  });

  if (!parsed.success) {
    throw new Error(formatEnvErrors(parsed.error));
  }

  const appHost = new URL(parsed.data.APP_URL).host;
  const authHost = new URL(parsed.data.NEXTAUTH_URL).host;

  if (appHost !== authHost) {
    throw new Error(
      [
        "Invalid environment configuration.",
        "APP_URL and NEXTAUTH_URL must use the same host.",
        `- APP_URL host: ${appHost}`,
        `- NEXTAUTH_URL host: ${authHost}`,
        "Mismatched hosts cause auth redirects (e.g. sign-out) to go to the wrong origin.",
        "Reference: .env.example",
      ].join("\n"),
    );
  }

  if (parsed.data.NODE_ENV === "production") {
    const requiredFirebaseKeys = [
      "NEXT_PUBLIC_FIREBASE_API_KEY",
      "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
      "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
      "NEXT_PUBLIC_FIREBASE_APP_ID",
      "NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID",
    ] as const;
    const missingKeys = requiredFirebaseKeys.filter((key) => !parsed.data[key]);

    if (missingKeys.length === 0) {
      return parsed.data;
    }

    throw new Error(
      [
        "Invalid environment configuration.",
        "Fix the following variables before starting the app:",
        ...missingKeys.map((key) => `- ${key}: required in production environment.`),
        "Reference: .env.example",
      ].join("\n"),
    );
  }

  return parsed.data;
}

export const env = parseEnv();

process.env.NEXTAUTH_URL ??= env.NEXTAUTH_URL;

if (env.NEXTAUTH_URL_INTERNAL) {
  process.env.NEXTAUTH_URL_INTERNAL ??= env.NEXTAUTH_URL_INTERNAL;
}

export function validateEnv() {
  return env;
}
