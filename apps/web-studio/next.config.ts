import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: true,
  transpilePackages: ["@rpa/shared-contracts"]
};

export default nextConfig;
