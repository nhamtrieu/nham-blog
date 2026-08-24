import { createHash, createHmac, randomBytes } from "node:crypto";

import { NEWSLETTER_CONFIRM_TOKEN_TTL_MS } from "@/lib/newsletter/constants";

export function generateNewsletterRawToken() {
  return randomBytes(32).toString("base64url");
}

export function hashNewsletterToken(rawToken: string) {
  return createHash("sha256").update(rawToken).digest("hex");
}

export function newsletterConfirmExpiresAt(from = new Date()) {
  return new Date(from.getTime() + NEWSLETTER_CONFIRM_TOKEN_TTL_MS);
}

/** Random salt stored on subscriber; used to mint/verify unsubscribe HMAC tokens. */
export function generateUnsubscribeSalt() {
  return randomBytes(32).toString("hex");
}

function requireAuthSecret() {
  const secret = process.env.NEXTAUTH_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error("NEXTAUTH_SECRET is required for newsletter unsubscribe tokens.");
  }

  return secret;
}

export function createUnsubscribeToken(subscriberId: string, salt: string) {
  const sig = createHmac("sha256", requireAuthSecret())
    .update(`newsletter:unsub:${subscriberId}:${salt}`)
    .digest("base64url");
  return `${subscriberId}.${sig}`;
}

export function parseUnsubscribeToken(rawToken: string): { subscriberId: string; sig: string } | null {
  const normalized = rawToken.trim();
  const separatorIndex = normalized.indexOf(".");

  if (separatorIndex <= 0 || separatorIndex === normalized.length - 1) {
    return null;
  }

  return {
    subscriberId: normalized.slice(0, separatorIndex),
    sig: normalized.slice(separatorIndex + 1),
  };
}

export function verifyUnsubscribeToken(rawToken: string, salt: string) {
  const parsed = parseUnsubscribeToken(rawToken);

  if (!parsed) {
    return null;
  }

  const expected = createUnsubscribeToken(parsed.subscriberId, salt);
  const expectedSig = expected.slice(expected.indexOf(".") + 1);

  if (expectedSig !== parsed.sig) {
    return null;
  }

  return parsed.subscriberId;
}
