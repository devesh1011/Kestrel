import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {},
  webpack: (config) => {
    // MetaMask SDK uses browser-only APIs; stub them out during SSR
    config.resolve.fallback = {
      ...config.resolve.fallback,
      "@metamask/sdk": false,
    };
    return config;
  },
};

export default nextConfig;
