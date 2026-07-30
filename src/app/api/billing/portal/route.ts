/**
 * Create a Stripe Customer Portal session.
 */

import { createCustomerPortalSession } from "@/features/billing/portal";
import { logger } from "@/lib/logger";
import {
  apiError,
  apiSuccess,
  enforceRateLimit,
  getRequestIp,
  rateLimitedResponse,
} from "@/lib/security";
import { requireUser } from "@/server/auth";

export async function POST(request: Request) {
  const route = "/api/billing/portal";

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

  const result = await createCustomerPortalSession(auth.user.id);

  if (!result.ok) {
    if (result.code === "NOT_CONFIGURED") {
      return apiError("INTERNAL", result.error, 503);
    }
    if (result.code === "NOT_FOUND") {
      return apiError("NOT_FOUND", result.error, 404);
    }
    logger.error("Portal failed", { route, userId: auth.user.id }, result.error);
    return apiError(
      "INTERNAL",
      "Unable to open billing portal. Please try again.",
      500,
    );
  }

  return apiSuccess(result.data);
}
