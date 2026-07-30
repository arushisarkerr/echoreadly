/**
 * Fetch a single background job owned by the signed-in user.
 */

import {
  getJobByIdForUser,
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

export async function GET(request: Request, context: RouteContext) {
  const route = "/api/jobs/[id]";
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
    const job = await getJobByIdForUser(id, auth.user.id);
    if (!job) {
      return apiError("NOT_FOUND", "Job not found.", 404);
    }
    return apiSuccess({ job: toJobView(job) });
  } catch (error) {
    logger.error(
      "Get job failed",
      { route, userId: auth.user.id, jobId: id },
      error,
    );
    return apiError("INTERNAL", "Unable to load job.", 500);
  }
}
