/**
 * Billing persistence — customers, subscriptions, webhook events, usage.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import type { PlanId, UsageMetric } from "@/constants";
import { createServiceClient } from "@/lib/supabase/server";

import type {
  BillingCustomerRow,
  BillingWebhookEventRow,
  SubscriptionRow,
  SubscriptionStatus,
  UsageCounterRow,
} from "./types";

function serviceClient(client?: SupabaseClient): SupabaseClient {
  return client ?? createServiceClient();
}

export async function getBillingCustomerByUserId(
  userId: string,
  client?: SupabaseClient,
): Promise<BillingCustomerRow | null> {
  const { data, error } = await serviceClient(client)
    .from("billing_customers")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as BillingCustomerRow | null) ?? null;
}

export async function getBillingCustomerByStripeId(
  stripeCustomerId: string,
  client?: SupabaseClient,
): Promise<BillingCustomerRow | null> {
  const { data, error } = await serviceClient(client)
    .from("billing_customers")
    .select("*")
    .eq("stripe_customer_id", stripeCustomerId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as BillingCustomerRow | null) ?? null;
}

export async function upsertBillingCustomer(
  input: {
    userId: string;
    stripeCustomerId: string;
    email?: string | null;
    trialUsedAt?: string | null;
  },
  client?: SupabaseClient,
): Promise<BillingCustomerRow> {
  const payload: Record<string, unknown> = {
    user_id: input.userId,
    stripe_customer_id: input.stripeCustomerId,
    email: input.email ?? null,
    updated_at: new Date().toISOString(),
  };

  if (input.trialUsedAt !== undefined) {
    payload.trial_used_at = input.trialUsedAt;
  }

  const { data, error } = await serviceClient(client)
    .from("billing_customers")
    .upsert(payload, { onConflict: "user_id" })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Unable to save billing customer.");
  }

  return data as BillingCustomerRow;
}

export async function markTrialUsed(
  userId: string,
  client?: SupabaseClient,
): Promise<void> {
  const { error } = await serviceClient(client)
    .from("billing_customers")
    .update({
      trial_used_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .is("trial_used_at", null);

  if (error) {
    throw new Error(error.message);
  }
}

export async function getSubscriptionByUserId(
  userId: string,
  client?: SupabaseClient,
): Promise<SubscriptionRow | null> {
  const { data, error } = await serviceClient(client)
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as SubscriptionRow | null) ?? null;
}

export async function getSubscriptionByStripeId(
  stripeSubscriptionId: string,
  client?: SupabaseClient,
): Promise<SubscriptionRow | null> {
  const { data, error } = await serviceClient(client)
    .from("subscriptions")
    .select("*")
    .eq("stripe_subscription_id", stripeSubscriptionId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as SubscriptionRow | null) ?? null;
}

export type UpsertSubscriptionInput = {
  userId: string;
  stripeCustomerId: string;
  stripeSubscriptionId?: string | null;
  stripePriceId?: string | null;
  planId: PlanId;
  status: SubscriptionStatus;
  billingInterval?: SubscriptionRow["billing_interval"];
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  cancelAtPeriodEnd?: boolean;
  canceledAt?: string | null;
  trialStart?: string | null;
  trialEnd?: string | null;
  usageResetAt?: string | null;
  latestInvoiceId?: string | null;
  checkoutSessionId?: string | null;
};

export async function upsertSubscription(
  input: UpsertSubscriptionInput,
  client?: SupabaseClient,
): Promise<SubscriptionRow> {
  const payload = {
    user_id: input.userId,
    stripe_customer_id: input.stripeCustomerId,
    stripe_subscription_id: input.stripeSubscriptionId ?? null,
    stripe_price_id: input.stripePriceId ?? null,
    plan_id: input.planId,
    status: input.status,
    billing_interval: input.billingInterval ?? null,
    current_period_start: input.currentPeriodStart ?? null,
    current_period_end: input.currentPeriodEnd ?? null,
    cancel_at_period_end: input.cancelAtPeriodEnd ?? false,
    canceled_at: input.canceledAt ?? null,
    trial_start: input.trialStart ?? null,
    trial_end: input.trialEnd ?? null,
    usage_reset_at: input.usageResetAt ?? null,
    latest_invoice_id: input.latestInvoiceId ?? null,
    checkout_session_id: input.checkoutSessionId ?? null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await serviceClient(client)
    .from("subscriptions")
    .upsert(payload, { onConflict: "user_id" })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Unable to save subscription.");
  }

  return data as SubscriptionRow;
}

export async function claimWebhookEvent(
  input: {
    id: string;
    type: string;
    livemode: boolean;
    payloadSummary?: string;
  },
  client?: SupabaseClient,
): Promise<{ claimed: boolean; existing: BillingWebhookEventRow | null }> {
  const db = serviceClient(client);

  const { data: existing } = await db
    .from("billing_webhook_events")
    .select("*")
    .eq("id", input.id)
    .maybeSingle();

  if (existing) {
    return {
      claimed: false,
      existing: existing as BillingWebhookEventRow,
    };
  }

  const { data, error } = await db
    .from("billing_webhook_events")
    .insert({
      id: input.id,
      type: input.type,
      livemode: input.livemode,
      payload_summary: input.payloadSummary ?? null,
    })
    .select("*")
    .single();

  if (error) {
    // Race: another worker claimed first.
    if (error.code === "23505") {
      return { claimed: false, existing: null };
    }
    throw new Error(error.message);
  }

  return {
    claimed: true,
    existing: data as BillingWebhookEventRow,
  };
}

export function currentUsagePeriodStart(
  usageResetAt?: string | null,
): string {
  if (usageResetAt) {
    return usageResetAt.slice(0, 10);
  }

  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

export async function getUsageCounts(
  userId: string,
  periodStart: string,
  client?: SupabaseClient,
): Promise<Record<UsageMetric, number>> {
  const { data, error } = await serviceClient(client)
    .from("usage_counters")
    .select("*")
    .eq("user_id", userId)
    .eq("period_start", periodStart);

  if (error) {
    throw new Error(error.message);
  }

  const counts: Record<UsageMetric, number> = {
    documents: 0,
    summaries: 0,
    chat: 0,
    translation: 0,
    tts: 0,
    export: 0,
  };

  for (const row of (data as UsageCounterRow[] | null) ?? []) {
    if (row.metric in counts) {
      counts[row.metric] = row.count;
    }
  }

  return counts;
}

export async function incrementUsage(
  userId: string,
  metric: UsageMetric,
  periodStart: string,
  amount = 1,
  client?: SupabaseClient,
): Promise<number> {
  const { data, error } = await serviceClient(client).rpc(
    "increment_usage_counter",
    {
      p_user_id: userId,
      p_metric: metric,
      p_period_start: periodStart,
      p_amount: amount,
    },
  );

  if (error) {
    throw new Error(error.message);
  }

  return typeof data === "number" ? data : Number(data) || amount;
}
