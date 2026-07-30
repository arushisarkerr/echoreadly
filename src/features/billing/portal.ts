/**
 * Stripe Customer Portal — manage payment method, cancel, resume.
 */

import { publicEnv } from "@/config/env";
import { ROUTES } from "@/constants";
import { logger } from "@/lib/logger";

import { getBillingCustomerByUserId } from "./persistence";
import {
  getStripe,
  isBillingConfigured,
} from "./stripe";
import type { PortalResult } from "./types";

export type CreatePortalServiceResult =
  | { ok: true; data: PortalResult }
  | {
      ok: false;
      error: string;
      code: "NOT_FOUND" | "NOT_CONFIGURED" | "INTERNAL";
    };

/**
 * Open the Stripe billing portal for an existing customer.
 */
export async function createCustomerPortalSession(
  userId: string,
): Promise<CreatePortalServiceResult> {
  if (!isBillingConfigured()) {
    return {
      ok: false,
      code: "NOT_CONFIGURED",
      error:
        "Billing is not configured yet. Add Stripe keys to enable the portal.",
    };
  }

  try {
    const customer = await getBillingCustomerByUserId(userId);
    if (!customer?.stripe_customer_id) {
      return {
        ok: false,
        code: "NOT_FOUND",
        error: "No billing account found. Upgrade to Pro first.",
      };
    }

    const stripe = getStripe();
    const appUrl = publicEnv.appUrl.replace(/\/$/, "");
    const session = await stripe.billingPortal.sessions.create({
      customer: customer.stripe_customer_id,
      return_url: `${appUrl}${ROUTES.settings}?billing=portal`,
    });

    return {
      ok: true,
      data: { url: session.url },
    };
  } catch (error) {
    logger.error("Portal session creation failed", { userId }, error);
    return {
      ok: false,
      code: "INTERNAL",
      error:
        error instanceof Error
          ? error.message
          : "Unable to open billing portal.",
    };
  }
}
