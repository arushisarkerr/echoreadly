/**
 * Canonical application route paths.
 */

export const ROUTES = {
  home: "/",
  dashboard: "/dashboard",
} as const;

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES];
