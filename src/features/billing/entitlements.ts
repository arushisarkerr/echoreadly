/**
 * Entitlements — resolve plan + usage for gating (cached briefly).
 */

import {
  DEFAULT_PLAN_ID,
  FREE_TTS_VOICE_IDS,
  getPlanDefinition,
  isUnlimitedLimit,
  planHasFeature,
  type PlanFeature,
  type PlanId,
  type UsageMetric,
} from "@/constants";

import {
  currentUsagePeriodStart,
  getSubscriptionByUserId,
  getUsageCounts,
} from "./persistence";
import type { BillingEntitlement, SubscriptionStatus } from "./types";
import { logger } from "@/lib/logger";

const CACHE_TTL_MS = 30_000;

type CacheEntry = {
  expiresAt: number;
  value: BillingEntitlement;
};

const entitlementCache = new Map<string, CacheEntry>();

const PREMIUM_STATUSES = new Set<SubscriptionStatus>([
  "active",
  "trialing",
]);

function forcePlanOverride(): PlanId | null {
  const raw = process.env.BILLING_FORCE_PLAN?.trim().toLowerCase();
  if (raw === "free" || raw === "pro") {
    return raw;
  }
  return null;
}

function isPremiumStatus(status: SubscriptionStatus): boolean {
  return PREMIUM_STATUSES.has(status);
}

function emptyUsage(): Record<UsageMetric, number> {
  return {
    documents: 0,
    summaries: 0,
    chat: 0,
    translation: 0,
    tts: 0,
    export: 0,
  };
}

function buildFreeEntitlement(
  usage: Record<UsageMetric, number>,
  usageResetAt: string | null,
): BillingEntitlement {
  const plan = getPlanDefinition(DEFAULT_PLAN_ID);
  return {
    planId: plan.id,
    planName: plan.name,
    status: "free",
    billingInterval: null,
    isPremium: false,
    isTrialing: false,
    cancelAtPeriodEnd: false,
    currentPeriodEnd: null,
    trialEnd: null,
    usageResetAt,
    canceledAt: null,
    features: plan.features,
    limits: { ...plan.limits },
    usage,
    stripeCustomerId: null,
    stripeSubscriptionId: null,
  };
}

/**
 * Resolve the caller's effective plan/limits. Never trust the client.
 */
export async function getEntitlement(
  userId: string,
  options?: { bypassCache?: boolean },
): Promise<BillingEntitlement> {
  const forced = forcePlanOverride();
  if (forced === "pro") {
    const plan = getPlanDefinition("pro");
    return {
      planId: plan.id,
      planName: plan.name,
      status: "active",
      billingInterval: "month",
      isPremium: true,
      isTrialing: false,
      cancelAtPeriodEnd: false,
      currentPeriodEnd: null,
      trialEnd: null,
      usageResetAt: currentUsagePeriodStart(null),
      canceledAt: null,
      features: plan.features,
      limits: { ...plan.limits },
      usage: emptyUsage(),
      stripeCustomerId: null,
      stripeSubscriptionId: null,
    };
  }

  if (!options?.bypassCache) {
    const cached = entitlementCache.get(userId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }
  }

  let subscription = null;
  try {
    subscription = await getSubscriptionByUserId(userId);
  } catch (error) {
    logger.warn("Subscription lookup failed; defaulting to free", {
      userId,
    }, error);
  }

  const periodStart = currentUsagePeriodStart(
    subscription?.usage_reset_at ?? subscription?.current_period_start,
  );

  let usage = emptyUsage();
  try {
    usage = await getUsageCounts(userId, periodStart);
  } catch (error) {
    logger.warn("Usage lookup failed; treating as zero", { userId }, error);
  }

  let entitlement: BillingEntitlement;

  if (
    !subscription ||
    !isPremiumStatus(subscription.status) ||
    forced === "free"
  ) {
    entitlement = buildFreeEntitlement(usage, periodStart);
    if (subscription) {
      entitlement.stripeCustomerId = subscription.stripe_customer_id;
      entitlement.stripeSubscriptionId = subscription.stripe_subscription_id;
      entitlement.cancelAtPeriodEnd = subscription.cancel_at_period_end;
      entitlement.currentPeriodEnd = subscription.current_period_end;
      entitlement.canceledAt = subscription.canceled_at;
      entitlement.trialEnd = subscription.trial_end;
      entitlement.billingInterval = subscription.billing_interval;
      entitlement.status = subscription.status;
    }
  } else {
    const planId: PlanId =
      subscription.plan_id === "pro" ? "pro" : DEFAULT_PLAN_ID;
    const plan = getPlanDefinition(planId);
    entitlement = {
      planId: plan.id,
      planName: plan.name,
      status: subscription.status,
      billingInterval: subscription.billing_interval,
      isPremium: planId === "pro",
      isTrialing: subscription.status === "trialing",
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      currentPeriodEnd: subscription.current_period_end,
      trialEnd: subscription.trial_end,
      usageResetAt: periodStart,
      canceledAt: subscription.canceled_at,
      features: plan.features,
      limits: { ...plan.limits },
      usage,
      stripeCustomerId: subscription.stripe_customer_id,
      stripeSubscriptionId: subscription.stripe_subscription_id,
    };
  }

  entitlementCache.set(userId, {
    expiresAt: Date.now() + CACHE_TTL_MS,
    value: entitlement,
  });

  return entitlement;
}

export function invalidateEntitlementCache(userId: string): void {
  entitlementCache.delete(userId);
}

export function hasFeatureAccess(
  entitlement: BillingEntitlement,
  feature: PlanFeature,
): boolean {
  return planHasFeature(entitlement.planId, feature);
}

export function getRemainingUsage(
  entitlement: BillingEntitlement,
  metric: UsageMetric,
): number | null {
  const limit = entitlement.limits[metric];
  if (isUnlimitedLimit(limit)) {
    return null;
  }
  return Math.max(0, limit - (entitlement.usage[metric] ?? 0));
}

export function isUsageAllowed(
  entitlement: BillingEntitlement,
  metric: UsageMetric,
): boolean {
  const limit = entitlement.limits[metric];
  if (isUnlimitedLimit(limit)) {
    return true;
  }
  return (entitlement.usage[metric] ?? 0) < limit;
}

export function isPremiumVoiceAllowed(
  entitlement: BillingEntitlement,
  voiceId: string,
): boolean {
  if (hasFeatureAccess(entitlement, "premium_voices")) {
    return true;
  }
  return (FREE_TTS_VOICE_IDS as readonly string[]).includes(voiceId);
}

export function usageLimitMessage(
  metric: UsageMetric,
  planName: string,
): string {
  const labels: Record<UsageMetric, string> = {
    documents: "document uploads",
    summaries: "summaries",
    chat: "chat messages",
    translation: "translations",
    tts: "narration requests",
    export: "audio exports",
  };

  return `You've reached the ${planName} plan limit for ${labels[metric]}. Upgrade to continue.`;
}

export function featureDeniedMessage(feature: PlanFeature): string {
  switch (feature) {
    case "translate":
      return "Translation is available on the Pro plan.";
    case "export":
      return "Audio export is available on the Pro plan.";
    case "premium_voices":
      return "Premium voices are available on the Pro plan.";
    case "chat":
      return "AI chat is not available on your current plan.";
    case "summarize":
      return "AI summary is not available on your current plan.";
    case "tts":
      return "Narration is not available on your current plan.";
    case "upload":
      return "Uploads are not available on your current plan.";
  }
}
