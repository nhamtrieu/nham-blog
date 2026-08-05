import assert from "node:assert/strict";
import test from "node:test";

import { UserRole } from "@/entities/user.entity";
import {
  decideGoogleReaderLink,
  prepareGoogleReaderIdentity,
} from "@/lib/auth/google-reader-link";

test("prepareGoogleReaderIdentity normalizes email and name", () => {
  const result = prepareGoogleReaderIdentity({
    email: "  Reader@Example.com  ",
    name: "  Google Reader  ",
    emailVerified: true,
  });

  assert.deepEqual(result, {
    email: "reader@example.com",
    name: "Google Reader",
  });
});

test("prepareGoogleReaderIdentity rejects missing email", () => {
  const result = prepareGoogleReaderIdentity({
    email: "   ",
    name: "Reader",
  });

  assert.deepEqual(result, {
    ok: false,
    reason: "MISSING_EMAIL",
  });
});

test("prepareGoogleReaderIdentity rejects unverified email", () => {
  const result = prepareGoogleReaderIdentity({
    email: "reader@example.com",
    emailVerified: false,
  });

  assert.deepEqual(result, {
    ok: false,
    reason: "EMAIL_NOT_VERIFIED",
  });
});

test("decideGoogleReaderLink creates when user is missing", () => {
  const result = decideGoogleReaderLink(null, {
    email: "reader@example.com",
    name: "Reader",
  });

  assert.deepEqual(result, { action: "create" });
});

test("decideGoogleReaderLink reuses reader and fills empty name", () => {
  const result = decideGoogleReaderLink(
    {
      role: UserRole.READER,
      name: null,
    },
    {
      email: "reader@example.com",
      name: "From Google",
    }
  );

  assert.deepEqual(result, {
    action: "reuse",
    updateName: "From Google",
  });
});

test("decideGoogleReaderLink denies admin emails", () => {
  const result = decideGoogleReaderLink(
    {
      role: UserRole.ADMIN,
      name: "Admin",
    },
    {
      email: "admin@example.com",
      name: "Admin",
    }
  );

  assert.deepEqual(result, {
    ok: false,
    reason: "ADMIN_FORBIDDEN",
  });
});
