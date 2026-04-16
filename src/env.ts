import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]),
  APP_URL: z.url("APP_URL must be a valid absolute URL."),
  NEXT_PUBLIC_SITE_NAME: z
    .string()
    .trim()
    .min(1, "NEXT_PUBLIC_SITE_NAME cannot be empty.")
    .default("Nham Blog"),
  NEXTAUTH_SECRET: z.string().min(32, "NEXTAUTH_SECRET must be at least 32 characters."),
  DATABASE_URL: z.string().trim().min(1).optional(),
  CLOUDINARY_CLOUD_NAME: z.string().trim().min(1).optional(),
  CLOUDINARY_API_KEY: z.string().trim().min(1).optional(),
  CLOUDINARY_API_SECRET: z.string().trim().min(1).optional(),
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
  const parsed = envSchema.safeParse({
    NODE_ENV: process.env.NODE_ENV,
    APP_URL: process.env.APP_URL,
    NEXT_PUBLIC_SITE_NAME: process.env.NEXT_PUBLIC_SITE_NAME,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    DATABASE_URL: process.env.DATABASE_URL,
    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
  });

  if (!parsed.success) {
    throw new Error(formatEnvErrors(parsed.error));
  }

  return parsed.data;
}

export const env = parseEnv();

export function validateEnv() {
  return env;
}
