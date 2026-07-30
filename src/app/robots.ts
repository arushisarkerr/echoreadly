import type { MetadataRoute } from "next";

import { siteConfig } from "@/config";

/**
 * Crawl rules — index marketing only; keep auth + app private.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard/", "/api/", "/auth/", "/login", "/signup"],
    },
    sitemap: `${siteConfig.url}/sitemap.xml`,
    host: siteConfig.url,
  };
}
