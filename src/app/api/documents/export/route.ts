/**
 * Audio export API — create/reuse cached MP3 or list owned exports.
 */

import {
  createOrReuseAudioExport,
  listOwnedAudioExports,
} from "@/features/export/export-service";
import type { CreateAudioExportInput } from "@/features/export/types";
import { trackAnalyticsEventAsync } from "@/features/analytics/track-event";
import {
  recordUsage,
  requireFeatureAndQuota,
} from "@/features/billing/gate";
import { logger } from "@/lib/logger";
import {
  apiError,
  apiSuccess,
  enforceRateLimit,
  getRequestIp,
  mapDomainFailure,
  rateLimitedResponse,
  validateDocumentId,
  validateFileName,
  validatePageNumber,
  validateStoragePath,
  validateSummaryType,
  validateTargetLanguage,
  validateTtsSource,
} from "@/lib/security";
import { requireUser } from "@/server/auth";
import type { TargetLanguageCode } from "@/constants";

type ExportRequestBody = {
  source?: unknown;
  documentId?: unknown;
  summaryType?: unknown;
  storagePath?: unknown;
  pageNumber?: unknown;
  originalFileName?: unknown;
  regenerate?: unknown;
  text?: unknown;
  targetLanguage?: unknown;
};

function parseRegenerate(value: unknown): boolean {
  return value === true || value === "true" || value === 1 || value === "1";
}

function parseOptionalTargetLanguage(
  value: unknown,
):
  | { ok: true; data: TargetLanguageCode | undefined }
  | { ok: false; code: "VALIDATION"; message: string } {
  if (value === undefined || value === null || value === "") {
    return { ok: true, data: undefined };
  }
  const validated = validateTargetLanguage(value);
  if (!validated.ok) {
    return validated;
  }
  return { ok: true, data: validated.data };
}

export async function GET(request: Request) {
  const route = "/api/documents/export";

  const auth = await requireUser();
  if (!auth.ok) {
    return apiError("UNAUTHORIZED", auth.error, auth.status);
  }

  const rate = await enforceRateLimit({
    bucket: "export",
    userId: auth.user.id,
    ip: getRequestIp(request),
  });

  if (!rate.ok) {
    logger.warn("Export list rate limited", {
      route,
      userId: auth.user.id,
      limitedBy: rate.limitedBy,
    });
    return rateLimitedResponse(rate);
  }

  const listed = await listOwnedAudioExports(auth.user.id);
  if (!listed.ok) {
    logger.error("Export list failed", {
      route,
      userId: auth.user.id,
    }, listed.error);
    return apiError(
      "INTERNAL",
      "Unable to load exports. Please try again.",
      500,
    );
  }

  return apiSuccess(listed.data);
}

export async function POST(request: Request) {
  const route = "/api/documents/export";

  const auth = await requireUser();
  if (!auth.ok) {
    return apiError("UNAUTHORIZED", auth.error, auth.status);
  }

  const gate = await requireFeatureAndQuota(
    auth.user.id,
    "export",
    "export",
  );
  if (!gate.ok) {
    return gate.response;
  }

  const rate = await enforceRateLimit({
    bucket: "export",
    userId: auth.user.id,
    ip: getRequestIp(request),
  });

  if (!rate.ok) {
    logger.warn("Export rate limited", {
      route,
      userId: auth.user.id,
      limitedBy: rate.limitedBy,
    });
    return rateLimitedResponse(rate);
  }

  let body: ExportRequestBody;

  try {
    body = (await request.json()) as ExportRequestBody;
  } catch {
    return apiError("VALIDATION", "Invalid request body.", 400);
  }

  if (body.text !== undefined) {
    return apiError(
      "VALIDATION",
      "text is not allowed for audio export.",
      400,
    );
  }

  const source = validateTtsSource(body.source);
  if (!source.ok) {
    return apiError(source.code, source.message, 400);
  }

  const regenerate = parseRegenerate(body.regenerate);
  const targetLanguage = parseOptionalTargetLanguage(body.targetLanguage);
  if (!targetLanguage.ok) {
    return apiError(targetLanguage.code, targetLanguage.message, 400);
  }

  let payload: CreateAudioExportInput;

  if (source.data === "summary") {
    const documentId = validateDocumentId(body.documentId);
    if (!documentId.ok) {
      return apiError(documentId.code, documentId.message, 400);
    }

    const summaryType = validateSummaryType(body.summaryType);
    if (!summaryType.ok) {
      return apiError(summaryType.code, summaryType.message, 400);
    }

    payload = {
      source: "summary",
      documentId: documentId.data,
      summaryType: summaryType.data,
      regenerate,
      targetLanguage: targetLanguage.data,
    };
  } else {
    const storagePath = validateStoragePath(body.storagePath);
    if (!storagePath.ok) {
      return apiError(storagePath.code, storagePath.message, 400);
    }

    const pageNumber = validatePageNumber(body.pageNumber);
    if (!pageNumber.ok) {
      return apiError(pageNumber.code, pageNumber.message, 400);
    }

    const originalFileName = validateFileName(body.originalFileName);
    if (!originalFileName.ok) {
      return apiError(originalFileName.code, originalFileName.message, 400);
    }

    payload = {
      source: "page",
      storagePath: storagePath.data,
      pageNumber: pageNumber.data,
      originalFileName: originalFileName.data,
      regenerate,
      targetLanguage: targetLanguage.data,
    };
  }

  try {
    const exported = await createOrReuseAudioExport(payload, auth.user.id);

    if (!exported.ok) {
      if (exported.code === "FORBIDDEN") {
        return apiError("FORBIDDEN", exported.error, 403);
      }
      if (exported.code === "NOT_FOUND") {
        return apiError("NOT_FOUND", exported.error, 404);
      }
      if (exported.code === "VALIDATION") {
        return apiError("VALIDATION", exported.error, 400);
      }

      logger.error("Audio export failed", {
        route,
        userId: auth.user.id,
        source: source.data,
      }, exported.error);
      return mapDomainFailure(exported.error, "tts");
    }

    if (!exported.data.cached) {
      try {
        await recordUsage(auth.user.id, "export", gate.entitlement);
      } catch (error) {
        logger.warn("Export usage record failed", {
          route,
          userId: auth.user.id,
        }, error);
      }

      trackAnalyticsEventAsync({
        userId: auth.user.id,
        eventName: "export_created",
        storagePath:
          payload.source === "page" ? payload.storagePath : null,
        metadata: {
          source: source.data,
          cached: false,
          documentId:
            payload.source === "summary" ? payload.documentId : undefined,
        },
      });
    }

    return apiSuccess(exported.data);
  } catch (error) {
    logger.error("Audio export threw", {
      route,
      userId: auth.user.id,
      source: source.data,
    }, error);
    return apiError(
      "TTS_ERROR",
      "Unable to export audio. Please try again.",
      500,
    );
  }
}
