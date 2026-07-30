/**
 * Plan catalog — Free / Pro with limits, features, and billing intervals.
 * Extensible for future tiers without rewriting gating.
 */

export type PlanId = "free" | "pro";

export type BillingInterval = "month" | "year";

export type PlanStatus = "active" | "coming_soon" | "retired";

export type PlanFeature =
  | "upload"
  | "summarize"
  | "chat"
  | "tts"
  | "translate"
  | "export"
  | "premium_voices";

export type UsageMetric =
  | "documents"
  | "summaries"
  | "chat"
  | "translation"
  | "tts"
  | "export";

export type PlanLimits = Record<UsageMetric, number>;

export type PlanDefinition = {
  id: PlanId;
  name: string;
  description: string;
  status: PlanStatus;
  /** Display prices in minor currency units (cents). */
  prices: {
    month: { amountCents: number; currency: "usd"; label: string };
    year: { amountCents: number; currency: "usd"; label: string };
  };
  features: readonly PlanFeature[];
  /** Monthly usage caps. Use -1 for unlimited. */
  limits: PlanLimits;
  trialDays: number;
};

export const PLAN_IDS = ["free", "pro"] as const satisfies readonly PlanId[];

export const DEFAULT_PLAN_ID: PlanId = "free";

/** Free-tier voices — premium voices require Pro. */
export const FREE_TTS_VOICE_IDS = ["alloy", "nova"] as const;

export const PLAN_CATALOG: Record<PlanId, PlanDefinition> = {
  free: {
    id: "free",
    name: "Personal",
    description: "Import, listen, translate, chat, and download MP3 audio.",
    status: "active",
    prices: {
      month: { amountCents: 0, currency: "usd", label: "$0" },
      year: { amountCents: 0, currency: "usd", label: "$0" },
    },
    features: [
      "upload",
      "summarize",
      "chat",
      "tts",
      "translate",
      "export",
      "premium_voices",
    ],
    limits: {
      documents: -1,
      summaries: -1,
      chat: -1,
      translation: -1,
      tts: -1,
      export: -1,
    },
    trialDays: 0,
  },
  pro: {
    id: "pro",
    name: "Pro",
    description:
      "Translation, audio export, premium voices, and higher monthly limits.",
    status: "active",
    prices: {
      month: { amountCents: 1200, currency: "usd", label: "$12" },
      year: { amountCents: 12000, currency: "usd", label: "$120" },
    },
    features: [
      "upload",
      "summarize",
      "chat",
      "tts",
      "translate",
      "export",
      "premium_voices",
    ],
    limits: {
      documents: 200,
      summaries: 300,
      chat: 1000,
      translation: 200,
      tts: 400,
      export: 100,
    },
    trialDays: 7,
  },
};

export function isPlanId(value: unknown): value is PlanId {
  return value === "free" || value === "pro";
}

export function isBillingInterval(value: unknown): value is BillingInterval {
  return value === "month" || value === "year";
}

export function getPlanDefinition(planId: PlanId): PlanDefinition {
  return PLAN_CATALOG[planId];
}

export function planHasFeature(
  planId: PlanId,
  feature: PlanFeature,
): boolean {
  return PLAN_CATALOG[planId].features.includes(feature);
}

export function getPlanLimit(
  planId: PlanId,
  metric: UsageMetric,
): number {
  return PLAN_CATALOG[planId].limits[metric];
}

export function isUnlimitedLimit(limit: number): boolean {
  return limit < 0;
}
