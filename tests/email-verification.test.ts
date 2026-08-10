import assert from "node:assert/strict";
import test from "node:test";

import {
  EMAIL_VERIFICATION_GRACE_MS,
  isVerificationGraceExpired,
  needsVerificationBanner,
} from "@/lib/auth/email-verification";
import {
  emailVerificationExpiresAt,
  generateEmailVerificationRawToken,
  hashEmailVerificationToken,
} from "@/lib/auth/email-verification-token";

test("needsVerificationBanner hides for admin and verified users", () => {
  assert.equal(needsVerificationBanner(null), false);
  assert.equal(
    needsVerificationBanner({ role: "ADMIN", emailVerified: false }),
    false
  );
  assert.equal(
    needsVerificationBanner({ role: "READER", emailVerified: true }),
    false
  );
  assert.equal(
    needsVerificationBanner({ role: "READER", emailVerified: false }),
    true
  );
});

test("isVerificationGraceExpired respects 24h window", () => {
  const now = Date.parse("2026-08-08T12:00:00.000Z");
  const withinGrace = new Date(now - EMAIL_VERIFICATION_GRACE_MS + 60_000).toISOString();
  const pastGrace = new Date(now - EMAIL_VERIFICATION_GRACE_MS - 1).toISOString();

  assert.equal(
    isVerificationGraceExpired(
      { role: "READER", emailVerified: false, createdAt: withinGrace },
      now
    ),
    false
  );
  assert.equal(
    isVerificationGraceExpired(
      { role: "READER", emailVerified: false, createdAt: pastGrace },
      now
    ),
    true
  );
  assert.equal(
    isVerificationGraceExpired(
      { role: "READER", emailVerified: true, createdAt: pastGrace },
      now
    ),
    false
  );
});

test("token hash is stable sha256 hex and expiry is +1 day", () => {
  const raw = generateEmailVerificationRawToken();
  assert.equal(raw.length > 20, true);
  assert.equal(hashEmailVerificationToken(raw), hashEmailVerificationToken(raw));
  assert.notEqual(hashEmailVerificationToken(raw), hashEmailVerificationToken(`${raw}x`));
  assert.match(hashEmailVerificationToken(raw), /^[a-f0-9]{64}$/);

  const from = new Date("2026-08-08T00:00:00.000Z");
  assert.equal(
    emailVerificationExpiresAt(from).toISOString(),
    "2026-08-09T00:00:00.000Z"
  );
});
