import assert from "node:assert/strict";
import test from "node:test";

import { escapeXml } from "@/lib/xml-escape";

test("escapeXml escapes special characters", () => {
  assert.equal(escapeXml(`a & b < c > d " e '`), "a &amp; b &lt; c &gt; d &quot; e &apos;");
});
