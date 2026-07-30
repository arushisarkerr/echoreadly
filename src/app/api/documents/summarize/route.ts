/**
 * Summarize a processed document — JSON for cache hits, SSE for fresh generation.
 */

import { logger } from "@/lib/logger";
import {
  requireFeatureAndQuota,
} from "@/features/billing/gate";
import {
  apiError,
  apiSuccess,
  enforceRateLimit,
  getRequestIp,
  mapDomainFailure,
  rateLimitedResponse,
  validateFileName,
  validateFileSize,
  validateStoragePath,
  validateSummaryType,
} from "@/lib/security";
import { requireUser } from "@/server/auth";
import { summarizeDocumentStreaming } from "@/server/stream-summarize";

type SummarizeRequestBody = {
  storagePath?: unknown;
  summaryType?: unknown;
  originalFileName?: unknown;
  fileSize?: unknown;
  regenerate?: unknown;
  stream?: unknown;
};

function wantsStream(request: Request, body: SummarizeRequestBody): boolean {
  if (body.stream === true || body.stream === "true") {
    return true;
  }
  const accept = request.headers.get("accept") ?? "";
  return accept.includes("text/event-stream");
}

export async function POST(request: Request) {
  const route = "/api/documents/summarize";

  const auth = await requireUser();
  if (!auth.ok) {
    return apiError("UNAUTHORIZED", auth.error, auth.status);
  }

  const gate = await requireFeatureAndQuota(
    auth.user.id,
    "summarize",
    "summaries",
  );
  if (!gate.ok) {
    return gate.response;
  }

  const rate = await enforceRateLimit({
    bucket: "summarize",
    userId: auth.user.id,
    ip: getRequestIp(request),
  });

  if (!rate.ok) {
    logger.warn("Summarize rate limited", {
      route,
      userId: auth.user.id,
      limitedBy: rate.limitedBy,
    });
    return rateLimitedResponse(rate);
  }

  let body: SummarizeRequestBody;

  try {
    body = (await request.json()) as SummarizeRequestBody;
  } catch {
    return apiError("VALIDATION", "Invalid request body.", 400);
  }

  const storagePath = validateStoragePath(body.storagePath);
  if (!storagePath.ok) {
    return apiError(storagePath.code, storagePath.message, 400);
  }

  const summaryType = validateSummaryType(body.summaryType);
  if (!summaryType.ok) {
    return apiError(summaryType.code, summaryType.message, 400);
  }

  const originalFileName = validateFileName(body.originalFileName);
  if (!originalFileName.ok) {
    return apiError(originalFileName.code, originalFileName.message, 400);
  }

  const fileSize = validateFileSize(body.fileSize);
  if (!fileSize.ok) {
    return apiError(fileSize.code, fileSize.message, 400);
  }

  const stream = wantsStream(request, body);

  try {
    if (!stream) {
      const { summarizeDocumentByStoragePath } = await import(
        "@/server/summarize-document"
      );
      const { recordUsage } = await import("@/features/billing/gate");

      const result = await summarizeDocumentByStoragePath({
        storagePath: storagePath.data,
        summaryType: summaryType.data,
        originalFileName: originalFileName.data,
        fileSize: fileSize.data,
        regenerate: body.regenerate === true,
      });

      if (!result.ok) {
        logger.aiFailure(
          "Summarize failed",
          {
            route,
            userId: auth.user.id,
            storagePath: storagePath.data,
            summaryType: summaryType.data,
          },
          result.error,
        );
        return mapDomainFailure(result.error, "ai");
      }

      try {
        await recordUsage(auth.user.id, "summaries", gate.entitlement);
      } catch (error) {
        logger.warn(
          "Summary usage record failed",
          {
            route,
            userId: auth.user.id,
          },
          error,
        );
      }

      return apiSuccess(result.data);
    }

    const streamed = await summarizeDocumentStreaming({
      userId: auth.user.id,
      storagePath: storagePath.data,
      summaryType: summaryType.data,
      originalFileName: originalFileName.data,
      fileSize: fileSize.data,
      regenerate: body.regenerate === true,
      signal: request.signal,
      entitlement: gate.entitlement,
      route,
    });

    if (!streamed.ok) {
      logger.aiFailure(
        "Summarize stream setup failed",
        {
          route,
          userId: auth.user.id,
          storagePath: storagePath.data,
        },
        streamed.error,
      );
      return mapDomainFailure(streamed.error, "ai");
    }

    if (streamed.outcome.mode === "json") {
      const { recordUsage } = await import("@/features/billing/gate");
      // Cached summary — still count toward quota for consistency with prior behavior.
      try {
        await recordUsage(auth.user.id, "summaries", gate.entitlement);
      } catch (error) {
        logger.warn(
          "Summary usage record failed",
          { route, userId: auth.user.id },
          error,
        );
      }
      return apiSuccess(streamed.outcome.data);
    }

    return streamed.outcome.response;
  } catch (error) {
    logger.aiFailure(
      "Summarize threw",
      {
        route,
        userId: auth.user.id,
        storagePath: storagePath.data,
      },
      error,
    );
    return apiError(
      "AI_ERROR",
      "Unable to complete the AI request. Please try again.",
      500,
    );
  }
}
