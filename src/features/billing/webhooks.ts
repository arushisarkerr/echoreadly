/**
 * Stripe webhook processing — signature verified, idempotent, retry-safe.
 */

import type Stripe from "stripe";

import { logger } from "@/lib/logger";
import { trackAnalyticsEventAsync } from "@/features/analytics/track-event";

import {
  claimWebhookEvent,
  getBillingCustomerByStripeId,
  getSubscriptionByStripeId,
  getSubscriptionByUserId,
  upsertSubscription,
} from "./persistence";
import { invalidateEntitlementCache } from "./entitlements";
import {
  getStripe,
  isBillingConfigured,
  resolvePlanFromPriceId,
} from "./stripe";
import type { SubscriptionStatus } from "./types";

function toIso(seconds: number | null | undefined): string | null {
  if (seconds == null || !Number.isFinite(seconds)) {
    return null;
  }
  return new Date(seconds * 1000).toISOString();
}

function mapStripeStatus(
  status: Stripe.Subscription.Status | string,
): SubscriptionStatus {
  switch (status) {
    case "trialing":
      return "trialing";
    case "active":
      return "active";
    case "past_due":
      return "past_due";
    case "canceled":
      return "canceled";
    case "unpaid":
      return "unpaid";
    case "incomplete":
      return "incomplete";
    case "incomplete_expired":
      return "incomplete_expired";
    case "paused":
      return "paused";
    default:
      return "expired";
  }
}

function priceIdFromSubscription(
  subscription: Stripe.Subscription,
): string | null {
  const item = subscription.items?.data?.[0];
  return item?.price?.id ?? null;
}

function periodFromSubscription(subscription: Stripe.Subscription): {
  start: string | null;
  end: string | null;
} {
  const item = subscription.items?.data?.[0] as
    | (Stripe.SubscriptionItem & {
        current_period_start?: number;
        current_period_end?: number;
      })
    | undefined;

  const start =
    item?.current_period_start ??
    (subscription as Stripe.Subscription & {
      current_period_start?: number;
    }).current_period_start;
  const end =
    item?.current_period_end ??
    (subscription as Stripe.Subscription & {
      current_period_end?: number;
    }).current_period_end;

  return { start: toIso(start), end: toIso(end) };
}

async function resolveUserId(input: {
  stripeCustomerId: string;
  metadataUserId?: string | null;
}): Promise<string | null> {
  if (input.metadataUserId) {
    return input.metadataUserId;
  }

  const customer = await getBillingCustomerByStripeId(input.stripeCustomerId);
  return customer?.user_id ?? null;
}

async function syncSubscriptionFromStripe(
  subscription: Stripe.Subscription,
  extras?: {
    checkoutSessionId?: string | null;
    latestInvoiceId?: string | null;
  },
): Promise<void> {
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;

  const userId = await resolveUserId({
    stripeCustomerId: customerId,
    metadataUserId: subscription.metadata?.user_id,
  });

  if (!userId) {
    logger.warn("Webhook subscription missing user mapping", {
      stripeSubscriptionId: subscription.id,
      stripeCustomerId: customerId,
    });
    return;
  }

  const priceId = priceIdFromSubscription(subscription);
  const resolved = resolvePlanFromPriceId(priceId);
  const period = periodFromSubscription(subscription);
  const status = mapStripeStatus(subscription.status);

  const planId =
    status === "canceled" ||
    status === "incomplete_expired" ||
    status === "expired"
      ? "free"
      : (resolved?.planId ?? "pro");

  await upsertSubscription({
    userId,
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscription.id,
    stripePriceId: priceId,
    planId: status === "active" || status === "trialing" || status === "past_due"
      ? "pro"
      : planId === "pro" && status === "canceled"
        ? "free"
        : planId,
    status:
      status === "canceled" && !subscription.cancel_at_period_end
        ? "canceled"
        : status,
    billingInterval: resolved?.interval ?? null,
    currentPeriodStart: period.start,
    currentPeriodEnd: period.end,
    cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
    canceledAt: toIso(subscription.canceled_at),
    trialStart: toIso(subscription.trial_start),
    trialEnd: toIso(subscription.trial_end),
    usageResetAt: period.start,
    latestInvoiceId:
      extras?.latestInvoiceId ??
      (typeof subscription.latest_invoice === "string"
        ? subscription.latest_invoice
        : subscription.latest_invoice?.id ?? null),
    checkoutSessionId: extras?.checkoutSessionId ?? null,
  });

  invalidateEntitlementCache(userId);

  trackAnalyticsEventAsync({
    userId,
    eventName: "subscription_updated",
    label: `Subscription ${status}`,
    activity: true,
    metadata: {
      status,
      planId,
      stripeSubscriptionId: subscription.id,
    },
  });
}

async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
): Promise<void> {
  if (session.mode !== "subscription") {
    return;
  }

  const customerId =
    typeof session.customer === "string"
      ? session.customer
      : session.customer?.id;

  if (!customerId) {
    return;
  }

  const userId =
    session.client_reference_id ||
    session.metadata?.user_id ||
    (await resolveUserId({ stripeCustomerId: customerId }));

  if (!userId) {
    logger.warn("Checkout completed without user mapping", {
      sessionId: session.id,
    });
    return;
  }

  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id;

  if (!subscriptionId) {
    await upsertSubscription({
      userId,
      stripeCustomerId: customerId,
      planId: "pro",
      status: "incomplete",
      checkoutSessionId: session.id,
    });
    invalidateEntitlementCache(userId);
    return;
  }

  const stripe = getStripe();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ["items.data.price"],
  });

  await syncSubscriptionFromStripe(subscription, {
    checkoutSessionId: session.id,
  });
}

async function handleInvoiceEvent(
  invoice: Stripe.Invoice,
  kind: "succeeded" | "failed",
): Promise<void> {
  const customerId =
    typeof invoice.customer === "string"
      ? invoice.customer
      : invoice.customer?.id;

  if (!customerId) {
    return;
  }

  const subscriptionId =
    typeof (invoice as Stripe.Invoice & { subscription?: string | { id: string } })
      .subscription === "string"
      ? (invoice as Stripe.Invoice & { subscription?: string }).subscription
      : (
          invoice as Stripe.Invoice & {
            subscription?: { id: string } | null;
          }
        ).subscription?.id;

  if (!subscriptionId) {
    return;
  }

  const stripe = getStripe();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ["items.data.price"],
  });

  await syncSubscriptionFromStripe(subscription, {
    latestInvoiceId: invoice.id,
  });

  if (kind === "failed") {
    logger.warn("Invoice payment failed", {
      invoiceId: invoice.id,
      subscriptionId,
      customerId,
    });
  }
}

async function handleRefundOrDispute(
  stripeCustomerId: string | null | undefined,
  reason: string,
): Promise<void> {
  if (!stripeCustomerId) {
    return;
  }

  const customer = await getBillingCustomerByStripeId(stripeCustomerId);
  if (!customer) {
    return;
  }

  logger.warn("Billing refund/dispute received", {
    userId: customer.user_id,
    stripeCustomerId,
    reason,
  });

  // Keep access until subscription status changes via subscription webhooks.
  // Audit only — entitlement follows Stripe subscription lifecycle.
}

/**
 * Process a verified Stripe event. Safe to retry.
 */
export async function processStripeWebhookEvent(
  event: Stripe.Event,
): Promise<{ ok: true; duplicate: boolean } | { ok: false; error: string }> {
  if (!isBillingConfigured()) {
    return { ok: false, error: "Billing is not configured." };
  }

  try {
    const claim = await claimWebhookEvent({
      id: event.id,
      type: event.type,
      livemode: event.livemode,
      payloadSummary: `${event.type}:${event.id}`,
    });

    if (!claim.claimed) {
      logger.info("Duplicate Stripe webhook ignored", {
        eventId: event.id,
        type: event.type,
      });
      return { ok: true, duplicate: true };
    }

    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(
          event.data.object as Stripe.Checkout.Session,
        );
        break;

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await syncSubscriptionFromStripe(
          event.data.object as Stripe.Subscription,
        );
        break;

      case "invoice.payment_succeeded":
      case "invoice.paid":
        await handleInvoiceEvent(
          event.data.object as Stripe.Invoice,
          "succeeded",
        );
        break;

      case "invoice.payment_failed":
        await handleInvoiceEvent(
          event.data.object as Stripe.Invoice,
          "failed",
        );
        break;

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        const customerId =
          typeof charge.customer === "string"
            ? charge.customer
            : charge.customer?.id;
        await handleRefundOrDispute(customerId, "refund");
        break;
      }

      case "charge.dispute.created": {
        const dispute = event.data.object as Stripe.Dispute;
        const chargeId =
          typeof dispute.charge === "string"
            ? dispute.charge
            : dispute.charge?.id;
        logger.warn("Chargeback/dispute created", {
          disputeId: dispute.id,
          chargeId,
        });
        // Resolve customer via existing subscription lookup if available.
        if (chargeId) {
          const stripe = getStripe();
          const charge = await stripe.charges.retrieve(chargeId);
          const customerId =
            typeof charge.customer === "string"
              ? charge.customer
              : charge.customer?.id;
          await handleRefundOrDispute(customerId, "chargeback");
        }
        break;
      }

      default:
        logger.info("Unhandled Stripe webhook type", {
          type: event.type,
          eventId: event.id,
        });
        break;
    }

    return { ok: true, duplicate: false };
  } catch (error) {
    logger.error(
      "Stripe webhook processing failed",
      { eventId: event.id, type: event.type },
      error,
    );
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Webhook processing failed.",
    };
  }
}

/** Verify Stripe signature and construct the event. */
export function constructStripeEvent(
  payload: string | Buffer,
  signature: string,
  webhookSecret: string,
): Stripe.Event {
  const stripe = getStripe();
  return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
}

export async function getSubscriptionSnapshot(userId: string) {
  return getSubscriptionByUserId(userId);
}

export async function getSubscriptionByStripeSubscriptionId(
  stripeSubscriptionId: string,
) {
  return getSubscriptionByStripeId(stripeSubscriptionId);
}
