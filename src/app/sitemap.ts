import type { MetadataRoute } from "next";

import { siteConfig } from "@/config";
import { ROUTES } from "@/constants";

/**
 * Public marketing sitemap — authenticated surfaces stay out of search.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteConfig.url.replace(/\/$/, "");

  return [
    {
      url: `${base}${ROUTES.home}`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
