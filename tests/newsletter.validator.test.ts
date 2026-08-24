import assert from "node:assert/strict";
import test from "node:test";

import {
  validateNewsletterSubscribeInput,
  validateNewsletterUnsubscribeInput,
} from "@/validators/newsletter.validator";

test("newsletter subscribe validates and lowercases email", () => {
  const ok = validateNewsletterSubscribeInput({
    email: "  Reader@Example.COM ",
    source: "footer",
  });
  assert.equal(ok.success, true);
  if (ok.success) {
    assert.equal(ok.data.email, "reader@example.com");
    assert.equal(ok.data.source, "footer");
  }

  const bad = validateNewsletterSubscribeInput({ email: "not-an-email" });
  assert.equal(bad.success, false);
});

test("newsletter unsubscribe requires token", () => {
  const ok = validateNewsletterUnsubscribeInput({ token: "abc.def" });
  assert.equal(ok.success, true);

  const bad = validateNewsletterUnsubscribeInput({ token: "  " });
  assert.equal(bad.success, false);
});
