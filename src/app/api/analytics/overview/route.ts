/**
 * Analytics overview API — server-side aggregation only.
 */

import { getAnalyticsOverview } from "@/features/analytics/overview";
import type { AnalyticsRangePreset } from "@/constants/analytics";
import { ANALYTICS_RANGE_PRESETS } from "@/constants/analytics";
import { logger } from "@/lib/logger";
import {
  apiError,
  apiSuccess,
  enforceRateLimit,
  getRequestIp,
  rateLimitedResponse,
} from "@/lib/security";
import { requireUser } from "@/server/auth";

function parsePreset(value: string | null): AnalyticsRangePreset | undefined {
  if (!value) {
    return undefined;
  }
  return (ANALYTICS_RANGE_PRESETS as readonly string[]).includes(value)
    ? (value as AnalyticsRangePreset)
    : undefined;
}

export async function GET(request: Request) {
  const route = "/api/analytics/overview";

  const auth = await requireUser();
  if (!auth.ok) {
    return apiError("UNAUTHORIZED", auth.error, auth.status);
  }

  const rate = await enforceRateLimit({
    bucket: "analytics",
    userId: auth.user.id,
    ip: getRequestIp(request),
  });

  if (!rate.ok) {
    return rateLimitedResponse(rate);
  }

  const url = new URL(request.url);
  const preset = parsePreset(url.searchParams.get("preset"));
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  if (preset === "custom") {
    if (from && !/^\d{4}-\d{2}-\d{2}$/.test(from)) {
      return apiError("VALIDATION", "from must be YYYY-MM-DD.", 400);
    }
    if (to && !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
      return apiError("VALIDATION", "to must be YYYY-MM-DD.", 400);
    }
  }

  try {
    const overview = await getAnalyticsOverview({
      userId: auth.user.id,
      preset,
      from,
      to,
    });
    return apiSuccess(overview);
  } catch (error) {
    logger.error(
      "Analytics overview failed",
      { route, userId: auth.user.id },
      error,
    );
    return apiError(
      "INTERNAL",
      "Unable to load analytics. Please try again.",
      500,
    );
  }
}
