import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.resolve(__dirname),
  serverExternalPackages: ["@prisma/client", "prisma", "@prisma/adapter-pg", "pg"],
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    optimizePackageImports: ['lucide-react'],
    serverActions: {
      bodySizeLimit: '100mb',
    },
  },
  webpack: (config) => {
    // Enable async WASM support so webpack doesn't transform WASM binaries
    // for any residual Prisma WASM imports that might still be encountered.
    config.experiments = { ...config.experiments, asyncWebAssembly: true };
    return config;
  },
};

export default nextConfig;
