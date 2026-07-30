/**
 * Stripe client and price configuration for EchoReadly billing.
 */

import Stripe from "stripe";

import type { BillingInterval } from "@/constants";
import { serverEnv } from "@/config/env";

let stripeClient: Stripe | null = null;

export function isBillingConfigured(): boolean {
  return Boolean(
    serverEnv.stripeSecretKey &&
      serverEnv.stripeWebhookSecret &&
      serverEnv.stripePriceProMonth &&
      serverEnv.stripePriceProYear,
  );
}

export function getStripe(): Stripe {
  const key = serverEnv.stripeSecretKey;
  if (!key) {
    throw new Error("Stripe is not configured (STRIPE_SECRET_KEY).");
  }

  if (!stripeClient) {
    stripeClient = new Stripe(key, {
      apiVersion: "2025-08-27.basil",
      typescript: true,
    });
  }

  return stripeClient;
}

export function getStripePriceId(interval: BillingInterval): string {
  const priceId =
    interval === "year"
      ? serverEnv.stripePriceProYear
      : serverEnv.stripePriceProMonth;

  if (!priceId) {
    throw new Error(
      interval === "year"
        ? "Missing STRIPE_PRICE_PRO_YEAR."
        : "Missing STRIPE_PRICE_PRO_MONTH.",
    );
  }

  return priceId;
}

export function resolvePlanFromPriceId(
  priceId: string | null | undefined,
): { planId: "pro"; interval: BillingInterval } | null {
  if (!priceId) {
    return null;
  }

  if (priceId === serverEnv.stripePriceProMonth) {
    return { planId: "pro", interval: "month" };
  }
  if (priceId === serverEnv.stripePriceProYear) {
    return { planId: "pro", interval: "year" };
  }

  // Unknown price — treat as Pro monthly so access is not silently dropped.
  return { planId: "pro", interval: "month" };
}
