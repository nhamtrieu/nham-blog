import type { NextConfig } from "next";

import { validateEnv } from "./src/env";

validateEnv();

const nextConfig: NextConfig = {
  transpilePackages: ["@mdxeditor/editor"],
  async redirects() {
    return [
      {
        source: "/tags/:slug",
        destination: "/blog?tag=:slug",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
