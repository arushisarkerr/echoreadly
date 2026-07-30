/**
 * Enqueue / list background jobs for the signed-in user.
 */

import { isJobStatus, isJobType } from "@/constants/jobs";
import {
  enqueueBackgroundJob,
} from "@/features/jobs/enqueue";
import {
  listJobsForUser,
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

type EnqueueBody = {
  jobType?: unknown;
  payload?: unknown;
  documentId?: unknown;
  storagePath?: unknown;
  idempotencyKey?: unknown;
};

export async function GET(request: Request) {
  const route = "/api/jobs";

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
  const statusParam = url.searchParams.get("status");
  const limit = Number(url.searchParams.get("limit") || "30");

  try {
    const status =
      statusParam && isJobStatus(statusParam) ? statusParam : undefined;
    const jobs = await listJobsForUser({
      userId: auth.user.id,
      status,
      limit: Number.isFinite(limit) ? limit : 30,
    });
    return apiSuccess({
      jobs: jobs.map(toJobView),
    });
  } catch (error) {
    logger.error("List jobs failed", { route, userId: auth.user.id }, error);
    return apiError("INTERNAL", "Unable to list jobs.", 500);
  }
}

export async function POST(request: Request) {
  const route = "/api/jobs";

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

  let body: EnqueueBody;
  try {
    body = (await request.json()) as EnqueueBody;
  } catch {
    return apiError("VALIDATION", "Invalid request body.", 400);
  }

  if (!isJobType(body.jobType)) {
    return apiError("VALIDATION", "Unsupported jobType.", 400);
  }

  // System-only jobs — not started from the personal app UI.
  if (
    body.jobType === "cleanup" ||
    body.jobType === "embedding_generate" ||
    body.jobType === "analytics_aggregate" ||
    body.jobType === "cache_refresh"
  ) {
    return apiError(
      "FORBIDDEN",
      "That job type can't be started from the app.",
      403,
    );
  }

  const payload =
    body.payload && typeof body.payload === "object" && !Array.isArray(body.payload)
      ? (body.payload as Record<string, unknown>)
      : {};

  const documentId =
    typeof body.documentId === "string" ? body.documentId.trim() : null;
  const storagePath =
    typeof body.storagePath === "string" ? body.storagePath.trim() : null;
  const idempotencyKey =
    typeof body.idempotencyKey === "string"
      ? body.idempotencyKey.trim()
      : undefined;

  // Ownership: storage paths must belong to the caller.
  if (storagePath && !storagePath.startsWith(`${auth.user.id}/`)) {
    return apiError("FORBIDDEN", "Invalid storage path.", 403);
  }

  try {
    const enqueued = await enqueueBackgroundJob({
      userId: auth.user.id,
      jobType: body.jobType,
      payload,
      documentId,
      storagePath,
      idempotencyKey,
    });

    return apiSuccess({
      job: enqueued.job,
      created: enqueued.created,
    });
  } catch (error) {
    logger.error("Enqueue job failed", { route, userId: auth.user.id }, error);
    return apiError("INTERNAL", "Unable to enqueue job.", 500);
  }
}
