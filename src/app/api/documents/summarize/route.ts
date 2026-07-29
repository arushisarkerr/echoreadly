/**
 * Summarize a processed document via OpenAI.
 * Hardened: auth, rate limits, payload validation, structured errors, logging.
 */

import { logger } from "@/lib/logger";
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
import { summarizeDocumentByStoragePath } from "@/server/summarize-document";

type SummarizeRequestBody = {
  storagePath?: unknown;
  summaryType?: unknown;
  originalFileName?: unknown;
  fileSize?: unknown;
};

export async function POST(request: Request) {
  const route = "/api/documents/summarize";

  const auth = await requireUser();
  if (!auth.ok) {
    return apiError("UNAUTHORIZED", auth.error, auth.status);
  }

  const rate = enforceRateLimit({
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

  try {
    const result = await summarizeDocumentByStoragePath({
      storagePath: storagePath.data,
      summaryType: summaryType.data,
      originalFileName: originalFileName.data,
      fileSize: fileSize.data,
    });

    if (!result.ok) {
      logger.aiFailure("Summarize failed", {
        route,
        userId: auth.user.id,
        storagePath: storagePath.data,
        summaryType: summaryType.data,
      }, result.error);
      return mapDomainFailure(result.error, "ai");
    }

    return apiSuccess(result.data);
  } catch (error) {
    logger.aiFailure("Summarize threw", {
      route,
      userId: auth.user.id,
      storagePath: storagePath.data,
    }, error);
    return apiError("AI_ERROR", "Unable to complete the AI request. Please try again.", 500);
  }
}
