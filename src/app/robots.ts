import type { MetadataRoute } from "next";

import { env } from "@/env";
import { absoluteUrl } from "@/lib/absolute-url";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api/admin"],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: new URL(env.APP_URL).host,
  };
}
