/**
 * Current billing entitlement for the signed-in user.
 */

import { getEntitlement } from "@/features/billing/entitlements";
import { logger } from "@/lib/logger";
import { apiError, apiSuccess } from "@/lib/security";
import { requireUser } from "@/server/auth";

export async function GET() {
  const auth = await requireUser();
  if (!auth.ok) {
    return apiError("UNAUTHORIZED", auth.error, auth.status);
  }

  try {
    const entitlement = await getEntitlement(auth.user.id);
    return apiSuccess(entitlement);
  } catch (error) {
    logger.error(
      "Billing status failed",
      { route: "/api/billing/status", userId: auth.user.id },
      error,
    );
    return apiError(
      "INTERNAL",
      "Unable to load billing status.",
      500,
    );
  }
}
