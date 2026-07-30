/**
 * Translate owned document content (document / page / selection / summary).
 */

import {
  translateDocumentContent,
  translateDocumentContentStreaming,
} from "@/features/translation/translate-service";
import type { TranslateRequestInput } from "@/features/translation/types";
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
  validateTranslationScope,
  validateTranslationSelectionText,
} from "@/lib/security";
import { requireUser } from "@/server/auth";

type TranslateBody = {
  scope?: unknown;
  storagePath?: unknown;
  originalFileName?: unknown;
  pageNumber?: unknown;
  documentId?: unknown;
  summaryType?: unknown;
  text?: unknown;
  targetLanguage?: unknown;
  regenerate?: unknown;
  stream?: unknown;
};

function parseRegenerate(value: unknown): boolean {
  return value === true || value === "true" || value === 1 || value === "1";
}

function wantsStream(request: Request, body: TranslateBody): boolean {
  if (body.stream === true || body.stream === "true") {
    return true;
  }
  const accept = request.headers.get("accept") ?? "";
  return accept.includes("text/event-stream");
}

export async function POST(request: Request) {
  const route = "/api/documents/translate";

  const auth = await requireUser();
  if (!auth.ok) {
    return apiError("UNAUTHORIZED", auth.error, auth.status);
  }

  const gate = await requireFeatureAndQuota(
    auth.user.id,
    "translate",
    "translation",
  );
  if (!gate.ok) {
    return gate.response;
  }

  const rate = await enforceRateLimit({
    bucket: "translate",
    userId: auth.user.id,
    ip: getRequestIp(request),
  });

  if (!rate.ok) {
    logger.warn("Translate rate limited", {
      route,
      userId: auth.user.id,
      limitedBy: rate.limitedBy,
    });
    return rateLimitedResponse(rate);
  }

  let body: TranslateBody;
  try {
    body = (await request.json()) as TranslateBody;
  } catch {
    return apiError("VALIDATION", "Invalid request body.", 400);
  }

  const scope = validateTranslationScope(body.scope);
  if (!scope.ok) {
    return apiError(scope.code, scope.message, 400);
  }

  const targetLanguage = validateTargetLanguage(body.targetLanguage);
  if (!targetLanguage.ok) {
    return apiError(targetLanguage.code, targetLanguage.message, 400);
  }

  const regenerate = parseRegenerate(body.regenerate);
  let payload: TranslateRequestInput;

  if (scope.data === "summary") {
    const documentId = validateDocumentId(body.documentId);
    if (!documentId.ok) {
      return apiError(documentId.code, documentId.message, 400);
    }
    const summaryType = validateSummaryType(body.summaryType);
    if (!summaryType.ok) {
      return apiError(summaryType.code, summaryType.message, 400);
    }
    payload = {
      scope: "summary",
      documentId: documentId.data,
      summaryType: summaryType.data,
      targetLanguage: targetLanguage.data,
      regenerate,
    };
  } else if (scope.data === "selection") {
    const storagePath = validateStoragePath(body.storagePath);
    if (!storagePath.ok) {
      return apiError(storagePath.code, storagePath.message, 400);
    }
    const originalFileName = validateFileName(body.originalFileName);
    if (!originalFileName.ok) {
      return apiError(originalFileName.code, originalFileName.message, 400);
    }
    const text = validateTranslationSelectionText(body.text);
    if (!text.ok) {
      return apiError(text.code, text.message, 400);
    }
    payload = {
      scope: "selection",
      storagePath: storagePath.data,
      originalFileName: originalFileName.data,
      text: text.data,
      targetLanguage: targetLanguage.data,
      regenerate,
    };
  } else if (scope.data === "page") {
    const storagePath = validateStoragePath(body.storagePath);
    if (!storagePath.ok) {
      return apiError(storagePath.code, storagePath.message, 400);
    }
    const originalFileName = validateFileName(body.originalFileName);
    if (!originalFileName.ok) {
      return apiError(originalFileName.code, originalFileName.message, 400);
    }
    const pageNumber = validatePageNumber(body.pageNumber);
    if (!pageNumber.ok) {
      return apiError(pageNumber.code, pageNumber.message, 400);
    }
    payload = {
      scope: "page",
      storagePath: storagePath.data,
      originalFileName: originalFileName.data,
      pageNumber: pageNumber.data,
      targetLanguage: targetLanguage.data,
      regenerate,
    };
  } else {
    const storagePath = validateStoragePath(body.storagePath);
    if (!storagePath.ok) {
      return apiError(storagePath.code, storagePath.message, 400);
    }
    const originalFileName = validateFileName(body.originalFileName);
    if (!originalFileName.ok) {
      return apiError(originalFileName.code, originalFileName.message, 400);
    }
    payload = {
      scope: "document",
      storagePath: storagePath.data,
      originalFileName: originalFileName.data,
      targetLanguage: targetLanguage.data,
      regenerate,
    };
  }

  try {
    if (wantsStream(request, body)) {
      const streamed = await translateDocumentContentStreaming({
        input: payload,
        userId: auth.user.id,
        signal: request.signal,
        entitlement: gate.entitlement,
        route,
      });

      if (!streamed.ok) {
        if (streamed.code === "FORBIDDEN") {
          return apiError("FORBIDDEN", streamed.error, 403);
        }
        if (streamed.code === "NOT_FOUND") {
          return apiError("NOT_FOUND", streamed.error, 404);
        }
        if (streamed.code === "VALIDATION") {
          return apiError("VALIDATION", streamed.error, 400);
        }
        logger.error(
          "Translation stream failed",
          {
            route,
            userId: auth.user.id,
            scope: scope.data,
          },
          streamed.error,
        );
        return mapDomainFailure(streamed.error, "ai");
      }

      if (streamed.data.mode === "json") {
        return apiSuccess(streamed.data.data);
      }

      return streamed.data.response;
    }

    const translated = await translateDocumentContent(payload, auth.user.id);
    if (!translated.ok) {
      if (translated.code === "FORBIDDEN") {
        return apiError("FORBIDDEN", translated.error, 403);
      }
      if (translated.code === "NOT_FOUND") {
        return apiError("NOT_FOUND", translated.error, 404);
      }
      if (translated.code === "VALIDATION") {
        return apiError("VALIDATION", translated.error, 400);
      }
      logger.error(
        "Translation failed",
        {
          route,
          userId: auth.user.id,
          scope: scope.data,
        },
        translated.error,
      );
      return mapDomainFailure(translated.error, "ai");
    }

    if (!translated.data.cached) {
      try {
        await recordUsage(auth.user.id, "translation", gate.entitlement);
      } catch (error) {
        logger.warn("Translation usage record failed", {
          route,
          userId: auth.user.id,
        }, error);
      }
    }

    return apiSuccess(translated.data);
  } catch (error) {
    logger.error(
      "Translation threw",
      {
        route,
        userId: auth.user.id,
        scope: scope.data,
      },
      error,
    );
    return apiError(
      "AI_ERROR",
      "Unable to translate. Please try again.",
      500,
    );
  }
}
