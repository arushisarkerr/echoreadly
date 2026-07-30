/**
 * Billing feature barrel — client-safe exports only.
 * Server helpers: import from specific modules (checkout, webhooks, gate, etc.).
 */

export type {
  BillingEntitlement,
  CheckoutRequest,
  CheckoutResult,
  PortalResult,
  SubscriptionStatus,
} from "./types";

export {
  requestBillingCheckout,
  requestBillingPortal,
  fetchBillingStatus,
} from "./billing-client";
export { BillingSettingsCard } from "./billing-settings-card";
export { useBilling, type UseBillingState } from "./use-billing";
