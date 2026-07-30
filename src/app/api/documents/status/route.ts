/**
 * Document preparing status for Library — processing_status + active jobs.
 */

import { listDocumentProcessingStatuses } from "@/features/persistence";
import { listJobsForUser } from "@/features/jobs/persistence";
import { logger } from "@/lib/logger";
import {
  apiError,
  apiSuccess,
  enforceRateLimit,
  getRequestIp,
  rateLimitedResponse,
} from "@/lib/security";
import { requireUser } from "@/server/auth";

export type DocumentPrepStatusCode = "preparing" | "ready" | "failed";

function toPrepStatus(
  processingStatus: string,
): DocumentPrepStatusCode {
  if (processingStatus === "failed") {
    return "failed";
  }
  if (
    processingStatus === "uploaded" ||
    processingStatus === "processing"
  ) {
    return "preparing";
  }
  return "ready";
}

function jobStoragePath(job: {
  storage_path: string | null;
  payload: Record<string, unknown>;
}): string | null {
  if (typeof job.storage_path === "string" && job.storage_path.trim()) {
    return job.storage_path.trim();
  }
  const fromPayload = job.payload?.storagePath;
  if (typeof fromPayload === "string" && fromPayload.trim()) {
    return fromPayload.trim();
  }
  return null;
}

export async function GET(request: Request) {
  const route = "/api/documents/status";

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

  try {
    const listed = await listDocumentProcessingStatuses(auth.user.id);
    if (!listed.ok) {
      logger.error(
        "List document statuses failed",
        { route, userId: auth.user.id },
        listed.error,
      );
      return apiError("INTERNAL", "Unable to load document status.", 500);
    }

    const byPath = new Map<string, DocumentPrepStatusCode>();

    for (const row of listed.data) {
      byPath.set(row.storagePath, toPrepStatus(row.processingStatus));
    }

    const jobs = await listJobsForUser({
      userId: auth.user.id,
      limit: 100,
    });

    for (const job of jobs) {
      if (
        job.job_type !== "document_process" &&
        job.job_type !== "ocr"
      ) {
        continue;
      }

      const path = jobStoragePath(job);
      if (!path) {
        continue;
      }

      if (
        job.status === "pending" ||
        job.status === "running" ||
        job.status === "retrying"
      ) {
        byPath.set(path, "preparing");
        continue;
      }

      if (job.status === "failed" && !byPath.has(path)) {
        byPath.set(path, "failed");
      }
    }

    return apiSuccess({
      statuses: Array.from(byPath.entries()).map(
        ([storagePath, status]) => ({
          storagePath,
          status,
        }),
      ),
    });
  } catch (error) {
    logger.error(
      "Document status lookup failed",
      { route, userId: auth.user.id },
      error,
    );
    return apiError("INTERNAL", "Unable to load document status.", 500);
  }
}
