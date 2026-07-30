/**
 * Centralized feature gating + usage enforcement for premium APIs.
 */

import type { PlanFeature, UsageMetric } from "@/constants";
import { apiError } from "@/lib/security";
import type { NextResponse } from "next/server";

import {
  currentUsagePeriodStart,
  incrementUsage,
} from "./persistence";
import {
  featureDeniedMessage,
  getEntitlement,
  getRemainingUsage,
  hasFeatureAccess,
  invalidateEntitlementCache,
  isPremiumVoiceAllowed,
  isUsageAllowed,
  usageLimitMessage,
} from "./entitlements";
import type { BillingEntitlement } from "./types";

export type GateResult =
  | { ok: true; entitlement: BillingEntitlement }
  | { ok: false; response: NextResponse };

/**
 * Require a plan feature. Returns a 403 response when denied.
 */
export async function requireFeature(
  userId: string,
  feature: PlanFeature,
): Promise<GateResult> {
  const entitlement = await getEntitlement(userId);

  if (!hasFeatureAccess(entitlement, feature)) {
    return {
      ok: false,
      response: apiError(
        "FORBIDDEN",
        featureDeniedMessage(feature),
        403,
      ),
    };
  }

  return { ok: true, entitlement };
}

/**
 * Require remaining quota for a usage metric. Does not increment.
 */
export async function requireUsageQuota(
  userId: string,
  metric: UsageMetric,
  entitlement?: BillingEntitlement,
): Promise<GateResult> {
  const current = entitlement ?? (await getEntitlement(userId));

  if (!isUsageAllowed(current, metric)) {
    return {
      ok: false,
      response: apiError(
        "LIMIT_EXCEEDED",
        usageLimitMessage(metric, current.planName),
        402,
      ),
    };
  }

  return { ok: true, entitlement: current };
}

/**
 * Require feature + usage quota in one step.
 */
export async function requireFeatureAndQuota(
  userId: string,
  feature: PlanFeature,
  metric: UsageMetric,
): Promise<GateResult> {
  const featureGate = await requireFeature(userId, feature);
  if (!featureGate.ok) {
    return featureGate;
  }

  return requireUsageQuota(userId, metric, featureGate.entitlement);
}

/**
 * Require the selected TTS voice is allowed on the caller's plan.
 */
export async function requireVoiceAccess(
  userId: string,
  voiceId: string,
): Promise<GateResult> {
  const entitlement = await getEntitlement(userId);

  if (!isPremiumVoiceAllowed(entitlement, voiceId)) {
    return {
      ok: false,
      response: apiError(
        "FORBIDDEN",
        featureDeniedMessage("premium_voices"),
        403,
      ),
    };
  }

  return { ok: true, entitlement };
}

/**
 * Increment usage after a successful premium action.
 */
export async function recordUsage(
  userId: string,
  metric: UsageMetric,
  entitlement?: BillingEntitlement,
  amount = 1,
): Promise<number> {
  const current = entitlement ?? (await getEntitlement(userId));
  const periodStart =
    current.usageResetAt ?? currentUsagePeriodStart(null);
  const next = await incrementUsage(userId, metric, periodStart, amount);
  invalidateEntitlementCache(userId);
  return next;
}

export function remainingHeaderValue(
  entitlement: BillingEntitlement,
  metric: UsageMetric,
): string {
  const remaining = getRemainingUsage(entitlement, metric);
  return remaining == null ? "unlimited" : String(remaining);
}
