/**
 * Text-to-speech for a stored document summary or a document page.
 * Hardened: auth, rate limits, payload validation, ownership checks,
 * structured errors, logging. Summary TTS never trusts client text.
 */

import { serverEnv } from "@/config";
import type { TargetLanguageCode } from "@/constants";
import {
  getDocumentById,
  getDocumentSummaryByType,
} from "@/features/persistence";
import { ensureDocumentProcessed } from "@/features/processing";
import { translateDocumentContent } from "@/features/translation/translate-service";
import {
  createOpenAiTtsProvider,
  joinPageChunkText,
  MAX_TTS_INPUT_CHARS,
} from "@/features/tts";
import { resolvePreferredTtsVoiceForUser } from "@/features/tts/resolve-preferred-voice";
import { logger } from "@/lib/logger";
import {
  apiBinary,
  apiError,
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
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/server/auth";

type TtsRequestBody = {
  source?: unknown;
  text?: unknown;
  documentId?: unknown;
  summaryType?: unknown;
  storagePath?: unknown;
  pageNumber?: unknown;
  originalFileName?: unknown;
  targetLanguage?: unknown;
};

function parseOptionalTargetLanguage(
  value: unknown,
):
  | { ok: true; data: TargetLanguageCode | null }
  | { ok: false; code: "VALIDATION"; message: string } {
  if (value === undefined || value === null || value === "") {
    return { ok: true, data: null };
  }
  const validated = validateTargetLanguage(value);
  if (!validated.ok) {
    return validated;
  }
  return { ok: true, data: validated.data };
}

const SUMMARY_UNAVAILABLE_MESSAGE = "Summary is not available.";

function getFileNameFromStoragePath(storagePath: string): string {
  const segments = storagePath.split("/");
  return segments[segments.length - 1] || "document.pdf";
}

export async function POST(request: Request) {
  const route = "/api/documents/tts";

  const auth = await requireUser();
  if (!auth.ok) {
    return apiError("UNAUTHORIZED", auth.error, auth.status);
  }

  const rate = await enforceRateLimit({
    bucket: "tts",
    userId: auth.user.id,
    ip: getRequestIp(request),
  });

  if (!rate.ok) {
    logger.warn("TTS rate limited", {
      route,
      userId: auth.user.id,
      limitedBy: rate.limitedBy,
    });
    return rateLimitedResponse(rate);
  }

  let body: TtsRequestBody;

  try {
    body = (await request.json()) as TtsRequestBody;
  } catch {
    return apiError("VALIDATION", "Invalid request body.", 400);
  }

  const source = validateTtsSource(body.source);
  if (!source.ok) {
    return apiError(source.code, source.message, 400);
  }

  const targetLanguage = parseOptionalTargetLanguage(body.targetLanguage);
  if (!targetLanguage.ok) {
    return apiError(targetLanguage.code, targetLanguage.message, 400);
  }

  let text = "";

  try {
    if (source.data === "summary") {
      if (body.text !== undefined) {
        return apiError(
          "VALIDATION",
          "text is not allowed for summary TTS.",
          400,
        );
      }

      const documentId = validateDocumentId(body.documentId);
      if (!documentId.ok) {
        return apiError(documentId.code, documentId.message, 400);
      }

      const summaryType = validateSummaryType(body.summaryType);
      if (!summaryType.ok) {
        return apiError(summaryType.code, summaryType.message, 400);
      }

      const document = await getDocumentById(
        documentId.data,
        auth.user.id,
      );

      if (!document.ok) {
        logger.ttsFailure("TTS summary document lookup failed", {
          route,
          userId: auth.user.id,
          documentId: documentId.data,
        }, document.error);
        return apiError(
          "TTS_ERROR",
          "Unable to generate speech. Please try again.",
          500,
        );
      }

      if (!document.data) {
        return apiError("NOT_FOUND", SUMMARY_UNAVAILABLE_MESSAGE, 404);
      }

      if (targetLanguage.data) {
        const translated = await translateDocumentContent(
          {
            scope: "summary",
            documentId: documentId.data,
            summaryType: summaryType.data,
            targetLanguage: targetLanguage.data,
          },
          auth.user.id,
        );

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
          logger.ttsFailure("TTS summary translation failed", {
            route,
            userId: auth.user.id,
            documentId: documentId.data,
            summaryType: summaryType.data,
            targetLanguage: targetLanguage.data,
          }, translated.error);
          return mapDomainFailure(translated.error, "tts");
        }

        text = translated.data.translatedText.trim();
      } else {
        const summary = await getDocumentSummaryByType(
          documentId.data,
          auth.user.id,
          summaryType.data,
        );

        if (!summary.ok) {
          logger.ttsFailure("TTS summary lookup failed", {
            route,
            userId: auth.user.id,
            documentId: documentId.data,
            summaryType: summaryType.data,
          }, summary.error);
          return apiError(
            "TTS_ERROR",
            "Unable to generate speech. Please try again.",
            500,
          );
        }

        if (!summary.data) {
          return apiError("NOT_FOUND", SUMMARY_UNAVAILABLE_MESSAGE, 404);
        }

        text = summary.data.content.trim();
      }

      if (!text) {
        return apiError(
          "VALIDATION",
          "Summary has no text to narrate.",
          400,
        );
      }

      if (text.length > MAX_TTS_INPUT_CHARS) {
        text = text.slice(0, MAX_TTS_INPUT_CHARS);
      }
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

      if (targetLanguage.data) {
        const translated = await translateDocumentContent(
          {
            scope: "page",
            storagePath: storagePath.data,
            originalFileName:
              originalFileName.data ??
              getFileNameFromStoragePath(storagePath.data),
            pageNumber: pageNumber.data,
            targetLanguage: targetLanguage.data,
          },
          auth.user.id,
        );

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
          logger.ttsFailure("TTS page translation failed", {
            route,
            userId: auth.user.id,
            storagePath: storagePath.data,
            pageNumber: pageNumber.data,
            targetLanguage: targetLanguage.data,
          }, translated.error);
          return mapDomainFailure(translated.error, "tts");
        }

        text = translated.data.translatedText.trim();
      } else {
        const processed = await ensureDocumentProcessed({
          storagePath: storagePath.data,
          originalFileName:
            originalFileName.data ??
            getFileNameFromStoragePath(storagePath.data),
        });

        if (!processed.ok) {
          logger.processingFailure("TTS page processing failed", {
            route,
            userId: auth.user.id,
            storagePath: storagePath.data,
            pageNumber: pageNumber.data,
          }, processed.error);
          return mapDomainFailure(processed.error, "processing");
        }

        text = joinPageChunkText(processed.data.chunks.chunks, pageNumber.data);
      }

      if (!text.trim()) {
        return apiError(
          "VALIDATION",
          "No extracted text is available for the current page.",
          400,
        );
      }

      if (text.length > MAX_TTS_INPUT_CHARS) {
        text = text.slice(0, MAX_TTS_INPUT_CHARS);
      }
    }

    const supabase = await createClient();
    const voice = await resolvePreferredTtsVoiceForUser(
      auth.user.id,
      supabase,
    );

    const provider = createOpenAiTtsProvider(serverEnv.openAiApiKey);
    const synthesized = await provider.synthesize({ text, voice });

    if (!synthesized.ok) {
      logger.ttsFailure("TTS synthesis failed", {
        route,
        userId: auth.user.id,
        source: source.data,
        voice,
      }, synthesized.error.message);
      return mapDomainFailure(synthesized.error.message, "tts");
    }

    return apiBinary(Buffer.from(synthesized.data.audio), {
      status: 200,
      headers: {
        "Content-Type": synthesized.data.mimeType,
        "Cache-Control": "no-store",
        "X-TTS-Source": source.data,
        "X-TTS-Character-Count": String(synthesized.data.characterCount),
        "X-TTS-Model": synthesized.data.model,
        "X-TTS-Voice": synthesized.data.voice,
      },
    });
  } catch (error) {
    logger.ttsFailure("TTS threw", {
      route,
      userId: auth.user.id,
      source: source.data,
    }, error);
    return apiError(
      "TTS_ERROR",
      "Unable to generate speech. Please try again.",
      500,
    );
  }
}
