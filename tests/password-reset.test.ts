import assert from "node:assert/strict";
import test from "node:test";

import { PASSWORD_RESET_TOKEN_TTL_MS } from "@/lib/auth/password-reset";
import {
  generatePasswordResetRawToken,
  hashPasswordResetToken,
  passwordResetExpiresAt,
} from "@/lib/auth/password-reset-token";

test("password reset token hash is stable sha256 hex and expiry is +1 hour", () => {
  const raw = generatePasswordResetRawToken();
  assert.equal(raw.length > 20, true);
  assert.equal(hashPasswordResetToken(raw), hashPasswordResetToken(raw));
  assert.notEqual(hashPasswordResetToken(raw), hashPasswordResetToken(`${raw}x`));
  assert.match(hashPasswordResetToken(raw), /^[a-f0-9]{64}$/);

  const from = new Date("2026-08-08T00:00:00.000Z");
  assert.equal(
    passwordResetExpiresAt(from).toISOString(),
    "2026-08-08T01:00:00.000Z"
  );
  assert.equal(PASSWORD_RESET_TOKEN_TTL_MS, 60 * 60 * 1000);
});
