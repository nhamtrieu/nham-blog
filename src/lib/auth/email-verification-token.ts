import { createHash, randomBytes } from "node:crypto";

import { EMAIL_VERIFICATION_TOKEN_TTL_MS } from "@/lib/auth/email-verification";

export function generateEmailVerificationRawToken() {
  return randomBytes(32).toString("base64url");
}

export function hashEmailVerificationToken(rawToken: string) {
  return createHash("sha256").update(rawToken).digest("hex");
}

export function emailVerificationExpiresAt(from = new Date()) {
  return new Date(from.getTime() + EMAIL_VERIFICATION_TOKEN_TTL_MS);
}
