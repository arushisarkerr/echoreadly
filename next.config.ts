import type { NextConfig } from "next";

import { getSecurityHeaders } from "./src/lib/security/headers";

/**
 * EchoReadly Next.js configuration.
 * Security headers are applied globally; API routes also set them on responses.
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  async headers() {
    const security = getSecurityHeaders();
    return [
      {
        source: "/:path*",
        headers: Object.entries(security).map(([key, value]) => ({
          key,
          value,
        })),
      },
    ];
  },
};

export default nextConfig;
