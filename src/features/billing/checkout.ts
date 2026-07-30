/**
 * Stripe Checkout — create subscription sessions (monthly / yearly).
 */

import { PLAN_CATALOG, type BillingInterval } from "@/constants";
import { publicEnv } from "@/config/env";
import { ROUTES } from "@/constants";
import { logger } from "@/lib/logger";

import {
  getBillingCustomerByUserId,
  getSubscriptionByUserId,
  markTrialUsed,
  upsertBillingCustomer,
} from "./persistence";
import { invalidateEntitlementCache } from "./entitlements";
import {
  getStripe,
  getStripePriceId,
  isBillingConfigured,
} from "./stripe";
import type { CheckoutResult } from "./types";

const ACTIVE_BLOCKING_STATUSES = new Set([
  "active",
  "trialing",
  "past_due",
  "unpaid",
  "incomplete",
]);

export type CreateCheckoutInput = {
  userId: string;
  email?: string | null;
  interval: BillingInterval;
};

export type CreateCheckoutServiceResult =
  | { ok: true; data: CheckoutResult }
  | {
      ok: false;
      error: string;
      code: "VALIDATION" | "CONFLICT" | "NOT_CONFIGURED" | "INTERNAL";
    };

async function ensureStripeCustomer(input: {
  userId: string;
  email?: string | null;
}): Promise<string> {
  const existing = await getBillingCustomerByUserId(input.userId);
  if (existing?.stripe_customer_id) {
    return existing.stripe_customer_id;
  }

  const stripe = getStripe();
  const customer = await stripe.customers.create({
    email: input.email || undefined,
    metadata: { user_id: input.userId },
  });

  await upsertBillingCustomer({
    userId: input.userId,
    stripeCustomerId: customer.id,
    email: input.email ?? null,
  });

  return customer.id;
}

/**
 * Start Checkout for Pro. Blocks duplicate active subscriptions.
 */
export async function createCheckoutSession(
  input: CreateCheckoutInput,
): Promise<CreateCheckoutServiceResult> {
  if (!isBillingConfigured()) {
    return {
      ok: false,
      code: "NOT_CONFIGURED",
      error:
        "Billing is not configured yet. Add Stripe keys to enable checkout.",
    };
  }

  try {
    const existingSub = await getSubscriptionByUserId(input.userId);
    if (
      existingSub &&
      ACTIVE_BLOCKING_STATUSES.has(existingSub.status) &&
      existingSub.plan_id === "pro"
    ) {
      return {
        ok: false,
        code: "CONFLICT",
        error:
          "You already have an active Pro subscription. Use Manage billing to change plans.",
      };
    }

    const customerId = await ensureStripeCustomer({
      userId: input.userId,
      email: input.email,
    });

    const customerRow = await getBillingCustomerByUserId(input.userId);
    const trialEligible = !customerRow?.trial_used_at;
    const trialDays = PLAN_CATALOG.pro.trialDays;

    const stripe = getStripe();
    const priceId = getStripePriceId(input.interval);
    const appUrl = publicEnv.appUrl.replace(/\/$/, "");

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      client_reference_id: input.userId,
      success_url: `${appUrl}${ROUTES.settings}?billing=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}${ROUTES.settings}?billing=canceled`,
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        trial_period_days:
          trialEligible && trialDays > 0 ? trialDays : undefined,
        metadata: {
          user_id: input.userId,
          plan_id: "pro",
          billing_interval: input.interval,
        },
      },
      metadata: {
        user_id: input.userId,
        plan_id: "pro",
        billing_interval: input.interval,
      },
    });

    if (!session.url) {
      return {
        ok: false,
        code: "INTERNAL",
        error: "Stripe did not return a checkout URL.",
      };
    }

    if (trialEligible && trialDays > 0) {
      await markTrialUsed(input.userId);
    }

    invalidateEntitlementCache(input.userId);

    return {
      ok: true,
      data: {
        url: session.url,
        sessionId: session.id,
      },
    };
  } catch (error) {
    logger.error(
      "Checkout session creation failed",
      { userId: input.userId },
      error,
    );
    return {
      ok: false,
      code: "INTERNAL",
      error:
        error instanceof Error
          ? error.message
          : "Unable to start checkout.",
    };
  }
}
