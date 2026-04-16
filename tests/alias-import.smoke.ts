import assert from "node:assert/strict";
import { siteConfig } from "@/src/config/site";

assert.ok(siteConfig.name.length > 0, "siteConfig.name should be available through the @/ alias");
