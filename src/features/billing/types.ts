/**
 * Billing feature types — subscriptions, checkout, entitlements.
 */

import type {
  BillingInterval,
  PlanFeature,
  PlanId,
  UsageMetric,
} from "@/constants";

export type SubscriptionStatus =
  | "free"
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "incomplete"
  | "incomplete_expired"
  | "paused"
  | "expired";

export type BillingCustomerRow = {
  user_id: string;
  stripe_customer_id: string;
  email: string | null;
  trial_used_at: string | null;
  created_at: string;
  updated_at: string;
};

export type SubscriptionRow = {
  user_id: string;
  stripe_customer_id: string;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  plan_id: PlanId;
  status: SubscriptionStatus;
  billing_interval: BillingInterval | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  canceled_at: string | null;
  trial_start: string | null;
  trial_end: string | null;
  usage_reset_at: string | null;
  latest_invoice_id: string | null;
  checkout_session_id: string | null;
  created_at: string;
  updated_at: string;
};

export type UsageCounterRow = {
  user_id: string;
  metric: UsageMetric;
  period_start: string;
  count: number;
  updated_at: string;
};

export type BillingWebhookEventRow = {
  id: string;
  type: string;
  processed_at: string;
  livemode: boolean;
  payload_summary: string | null;
  created_at: string;
};

/** Effective entitlement snapshot for gating / Settings. */
export type BillingEntitlement = {
  planId: PlanId;
  planName: string;
  status: SubscriptionStatus;
  billingInterval: BillingInterval | null;
  isPremium: boolean;
  isTrialing: boolean;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
  trialEnd: string | null;
  usageResetAt: string | null;
  canceledAt: string | null;
  features: readonly PlanFeature[];
  limits: Record<UsageMetric, number>;
  usage: Record<UsageMetric, number>;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
};

export type CheckoutRequest = {
  planId: "pro";
  interval: BillingInterval;
};

export type CheckoutResult = {
  url: string;
  sessionId: string;
};

export type PortalResult = {
  url: string;
};
