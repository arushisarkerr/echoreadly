import type { MetadataRoute } from "next";

import { siteConfig } from "@/config";

/**
 * Crawl rules for the public marketing site.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: `${siteConfig.url}/sitemap.xml`,
    host: siteConfig.url,
  };
}
