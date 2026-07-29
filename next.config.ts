import type { NextConfig } from "next";

import { getSecurityHeaders } from "./src/lib/security/headers";

/**
 * EchoReadly Next.js configuration.
 * Security headers are applied globally; API routes also set them on responses.
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Native PDFium (koffi + libpdfium) must stay external to the server bundle.
  serverExternalPackages: ["koffi", "pdfium-native"],
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
