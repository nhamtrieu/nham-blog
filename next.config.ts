import type { NextConfig } from "next";

import { validateEnv } from "./src/env";

validateEnv();

const nextConfig: NextConfig = {
  transpilePackages: ["@mdxeditor/editor"],
};

export default nextConfig;
