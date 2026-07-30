/**
 * Stripe webhooks — raw body, signature verification, idempotent processing.
 */

import { serverEnv } from "@/config/env";
import {
  constructStripeEvent,
  processStripeWebhookEvent,
} from "@/features/billing/webhooks";
import { isBillingConfigured } from "@/features/billing/stripe";
import { logger } from "@/lib/logger";
import { apiError, apiSuccess } from "@/lib/security";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const route = "/api/billing/webhook";

  if (!isBillingConfigured()) {
    return apiError("INTERNAL", "Billing is not configured.", 503);
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return apiError("VALIDATION", "Missing Stripe signature.", 400);
  }

  const webhookSecret = serverEnv.stripeWebhookSecret;
  if (!webhookSecret) {
    return apiError("INTERNAL", "Webhook secret is not configured.", 503);
  }

  let event;
  try {
    const payload = await request.text();
    event = constructStripeEvent(payload, signature, webhookSecret);
  } catch (error) {
    logger.warn("Invalid Stripe webhook signature", { route }, error);
    return apiError("VALIDATION", "Invalid webhook signature.", 400);
  }

  const processed = await processStripeWebhookEvent(event);

  if (!processed.ok) {
    logger.error(
      "Stripe webhook failed",
      { route, eventId: event.id, type: event.type },
      processed.error,
    );
    // Return 500 so Stripe retries.
    return apiError("INTERNAL", "Webhook processing failed.", 500);
  }

  return apiSuccess({
    received: true,
    duplicate: processed.duplicate,
  });
}
