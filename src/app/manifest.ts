import type { MetadataRoute } from "next";

import { siteConfig } from "@/config";

/**
 * Web app manifest for install / home-screen branding.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: siteConfig.name,
    short_name: siteConfig.name,
    description: siteConfig.description,
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#eef3f1",
    theme_color: "#0f766e",
    lang: "en",
    categories: ["productivity", "education", "utilities"],
    icons: [
      {
        src: "/icon",
        sizes: "32x32",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
