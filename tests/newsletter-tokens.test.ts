import assert from "node:assert/strict";
import test from "node:test";

process.env.NEXTAUTH_SECRET ??= "test-nextauth-secret-at-least-32-chars!!";

import { NEWSLETTER_CONFIRM_TOKEN_TTL_MS } from "@/lib/newsletter/constants";
import {
  createUnsubscribeToken,
  generateNewsletterRawToken,
  generateUnsubscribeSalt,
  hashNewsletterToken,
  newsletterConfirmExpiresAt,
  parseUnsubscribeToken,
  verifyUnsubscribeToken,
} from "@/lib/newsletter/tokens";

test("newsletter confirm token hash is stable sha256 hex and expiry is +2 days", () => {
  const raw = generateNewsletterRawToken();
  assert.equal(raw.length > 20, true);
  assert.equal(hashNewsletterToken(raw), hashNewsletterToken(raw));
  assert.notEqual(hashNewsletterToken(raw), hashNewsletterToken(`${raw}x`));
  assert.match(hashNewsletterToken(raw), /^[a-f0-9]{64}$/);

  const from = new Date("2026-08-08T00:00:00.000Z");
  assert.equal(
    newsletterConfirmExpiresAt(from).toISOString(),
    "2026-08-10T00:00:00.000Z"
  );
  assert.equal(NEWSLETTER_CONFIRM_TOKEN_TTL_MS, 2 * 24 * 60 * 60 * 1000);
});

test("unsubscribe HMAC token verifies with salt and rejects tampering", () => {
  const subscriberId = "11111111-1111-1111-1111-111111111111";
  const salt = generateUnsubscribeSalt();
  assert.match(salt, /^[a-f0-9]{64}$/);

  const token = createUnsubscribeToken(subscriberId, salt);
  const parsed = parseUnsubscribeToken(token);
  assert.ok(parsed);
  assert.equal(parsed.subscriberId, subscriberId);
  assert.equal(verifyUnsubscribeToken(token, salt), subscriberId);
  assert.equal(verifyUnsubscribeToken(`${token}x`, salt), null);
  assert.equal(verifyUnsubscribeToken(token, `${salt}ff`), null);
});
