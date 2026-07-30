/**
 * Worker tick — claim and process due background jobs.
 *
 * Auth:
 * - Bearer JOB_WORKER_SECRET (cron / dedicated worker), or
 * - Signed-in user (can kick processing of due jobs).
 */

import { serverEnv } from "@/config";
import { runCleanupJobsRpc } from "@/features/jobs/persistence";
import { processJobBatch } from "@/features/jobs/runner";
import { logger } from "@/lib/logger";
import {
  apiError,
  apiSuccess,
  enforceRateLimit,
  getRequestIp,
  rateLimitedResponse,
} from "@/lib/security";
import { requireUser } from "@/server/auth";

export const runtime = "nodejs";
export const maxDuration = 300;

function authorizeWorker(request: Request): boolean {
  const secret = serverEnv.jobWorkerSecret;
  if (!secret) {
    return false;
  }
  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  return Boolean(token && token === secret);
}

export async function POST(request: Request) {
  const route = "/api/jobs/worker";

  const secretAuth = authorizeWorker(request);
  let workerId = `http-${process.pid}`;

  if (!secretAuth) {
    const auth = await requireUser();
    if (!auth.ok) {
      return apiError(
        "UNAUTHORIZED",
        "Worker secret or signed-in session required.",
        401,
      );
    }

    const rate = await enforceRateLimit({
      bucket: "analytics",
      userId: auth.user.id,
      ip: getRequestIp(request),
    });
    if (!rate.ok) {
      return rateLimitedResponse(rate);
    }

    workerId = `user-${auth.user.id.slice(0, 8)}`;
  }

  let body: { limit?: unknown; runCleanup?: unknown } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }

  const limit =
    typeof body.limit === "number" && Number.isFinite(body.limit)
      ? Math.min(10, Math.max(1, Math.floor(body.limit)))
      : undefined;

  try {
    let cleaned = 0;
    if (secretAuth && body.runCleanup === true) {
      cleaned = await runCleanupJobsRpc({ olderThanDays: 14, limit: 500 });
    }

    const result = await processJobBatch({ limit, workerId });
    return apiSuccess({ ...result, cleaned });
  } catch (error) {
    logger.error("Worker tick failed", { route, workerId }, error);
    return apiError("INTERNAL", "Worker tick failed.", 500);
  }
}
