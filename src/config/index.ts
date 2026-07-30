/**
 * Barrel export for application configuration.
 */

export { publicEnv, serverEnv, type PublicEnv, type ServerEnv } from "./env";
export { siteConfig, type SiteConfig } from "./site";
export {
  assertRequiredEnv,
  getAuthPublicEnvStatus,
  isAuthPublicEnvConfigured,
  isProductionRuntime,
  REQUIRED_AUTH_PUBLIC_ENV,
  REQUIRED_ENV_VARS,
  type AuthPublicEnvStatus,
} from "./validate-env";
