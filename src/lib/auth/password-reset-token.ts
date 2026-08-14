import { createHash, randomBytes } from "node:crypto";

import { PASSWORD_RESET_TOKEN_TTL_MS } from "@/lib/auth/password-reset";

export function generatePasswordResetRawToken() {
  return randomBytes(32).toString("base64url");
}

export function hashPasswordResetToken(rawToken: string) {
  return createHash("sha256").update(rawToken).digest("hex");
}

export function passwordResetExpiresAt(from = new Date()) {
  return new Date(from.getTime() + PASSWORD_RESET_TOKEN_TTL_MS);
}
