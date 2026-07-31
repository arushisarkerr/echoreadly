/**
 * Canonical application route paths.
 */

export const ROUTES = {
  home: "/",
  dashboard: "/dashboard",
  import: "/dashboard/import",
  library: "/dashboard/library",
  reader: "/dashboard/reader",
  listen: "/dashboard/listen",
  ai: "/dashboard/ai",
  export: "/dashboard/export",
  history: "/dashboard/history",
  search: "/dashboard/search",
  settings: "/dashboard/settings",
} as const;

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES];
