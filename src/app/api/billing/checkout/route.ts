/**
 * Create a Stripe Checkout session for Pro (monthly / yearly).
 */

import { createCheckoutSession } from "@/features/billing/checkout";
import { isBillingInterval } from "@/constants";
import { logger } from "@/lib/logger";
import {
  apiError,
  apiSuccess,
  enforceRateLimit,
  getRequestIp,
  rateLimitedResponse,
} from "@/lib/security";
import { requireUser } from "@/server/auth";

type CheckoutBody = {
  planId?: unknown;
  interval?: unknown;
};

export async function POST(request: Request) {
  const route = "/api/billing/checkout";

  const auth = await requireUser();
  if (!auth.ok) {
    return apiError("UNAUTHORIZED", auth.error, auth.status);
  }

  const rate = await enforceRateLimit({
    bucket: "billing",
    userId: auth.user.id,
    ip: getRequestIp(request),
  });

  if (!rate.ok) {
    return rateLimitedResponse(rate);
  }

  let body: CheckoutBody;
  try {
    body = (await request.json()) as CheckoutBody;
  } catch {
    return apiError("VALIDATION", "Invalid request body.", 400);
  }

  if (body.planId !== undefined && body.planId !== "pro") {
    return apiError("VALIDATION", "Only the Pro plan can be purchased.", 400);
  }

  if (!isBillingInterval(body.interval)) {
    return apiError(
      "VALIDATION",
      "interval must be month or year.",
      400,
    );
  }

  const result = await createCheckoutSession({
    userId: auth.user.id,
    email: auth.user.email,
    interval: body.interval,
  });

  if (!result.ok) {
    if (result.code === "NOT_CONFIGURED") {
      return apiError("INTERNAL", result.error, 503);
    }
    if (result.code === "CONFLICT") {
      return apiError("FORBIDDEN", result.error, 409);
    }
    if (result.code === "VALIDATION") {
      return apiError("VALIDATION", result.error, 400);
    }
    logger.error(
      "Checkout failed",
      { route, userId: auth.user.id },
      result.error,
    );
    return apiError(
      "INTERNAL",
      "Unable to start checkout. Please try again.",
      500,
    );
  }

  return apiSuccess(result.data);
}
