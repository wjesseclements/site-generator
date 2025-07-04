import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export', // Enable for static build
  trailingSlash: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
