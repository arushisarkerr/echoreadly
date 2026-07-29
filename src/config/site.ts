import {
  APP_DESCRIPTION,
  APP_NAME,
  APP_TAGLINE,
} from "@/constants";
import { publicEnv } from "@/config/env";

/**
 * Site configuration used by metadata, layouts, and shared chrome.
 *
 * Centralizing these values keeps branding and SEO consistent as routes grow.
 */
export const siteConfig = {
  name: APP_NAME,
  tagline: APP_TAGLINE,
  description: APP_DESCRIPTION,
  url: publicEnv.appUrl,
  locale: "en_US",
} as const;

export type SiteConfig = typeof siteConfig;
