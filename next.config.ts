import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Reduce experimental features
  experimental: {},
  // Optimize for lower resource usage
  poweredByHeader: false,
  generateEtags: false,
  // Allow dev origins for preview
  allowedDevOrigins: [
    ".space.z.ai",
    "localhost",
  ],
};

export default nextConfig;
