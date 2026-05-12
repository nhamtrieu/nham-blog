import assert from "node:assert/strict";
import test from "node:test";

import { validateReaderRegisterInput } from "@/validators/reader-auth.validator";

test("validateReaderRegisterInput trims email and name", () => {
  const result = validateReaderRegisterInput({
    email: "  reader@example.com  ",
    name: "  Reader Name  ",
    password: "password123",
  });

  assert.equal(result.success, true);

  if (!result.success) {
    return;
  }

  assert.deepEqual(result.data, {
    email: "reader@example.com",
    name: "Reader Name",
    password: "password123",
  });
});

test("validateReaderRegisterInput requires a strong enough password", () => {
  const result = validateReaderRegisterInput({
    email: "reader@example.com",
    name: "Reader",
    password: "short",
  });

  assert.deepEqual(result, {
    success: false,
    error: {
      code: "VALIDATION_ERROR",
      message: "Reader auth payload is invalid.",
      fields: {
        password: ["Password must be at least 8 characters."],
      },
    },
  });
});
