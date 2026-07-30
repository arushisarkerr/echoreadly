/**
 * Cancel a pending/retrying job owned by the signed-in user.
 */

import {
  cancelJobForUser,
  toJobView,
} from "@/features/jobs/persistence";
import { logger } from "@/lib/logger";
import {
  apiError,
  apiSuccess,
  enforceRateLimit,
  getRequestIp,
  rateLimitedResponse,
} from "@/lib/security";
import { requireUser } from "@/server/auth";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const route = "/api/jobs/[id]/cancel";
  const { id } = await context.params;

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

  if (!id?.trim()) {
    return apiError("VALIDATION", "Job id is required.", 400);
  }

  try {
    const cancelled = await cancelJobForUser({
      jobId: id,
      userId: auth.user.id,
    });

    if (!cancelled) {
      return apiError(
        "FORBIDDEN",
        "Job cannot be cancelled (not found or already running/finished).",
        409,
      );
    }

    return apiSuccess({ job: toJobView(cancelled) });
  } catch (error) {
    logger.error(
      "Cancel job failed",
      { route, userId: auth.user.id, jobId: id },
      error,
    );
    return apiError("INTERNAL", "Unable to cancel job.", 500);
  }
}
