/**
 * Text-to-speech for summary text or a document page.
 * Hardened: auth, rate limits, payload validation, structured errors, logging.
 */

import { serverEnv } from "@/config";
import { ensureDocumentProcessed } from "@/features/processing";
import {
  createOpenAiTtsProvider,
  joinPageChunkText,
  MAX_TTS_INPUT_CHARS,
} from "@/features/tts";
import { logger } from "@/lib/logger";
import {
  apiBinary,
  apiError,
  enforceRateLimit,
  getRequestIp,
  mapDomainFailure,
  rateLimitedResponse,
  validateFileName,
  validatePageNumber,
  validateStoragePath,
  validateTtsSource,
  validateTtsText,
} from "@/lib/security";
import { requireUser } from "@/server/auth";

type TtsRequestBody = {
  source?: unknown;
  text?: unknown;
  storagePath?: unknown;
  pageNumber?: unknown;
  originalFileName?: unknown;
};

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

  const rate = enforceRateLimit({
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

  let text = "";

  try {
    if (source.data === "summary") {
      const validated = validateTtsText(body.text);
      if (!validated.ok) {
        return apiError(validated.code, validated.message, 400);
      }
      text = validated.data;
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

    const provider = createOpenAiTtsProvider(serverEnv.openAiApiKey);
    const synthesized = await provider.synthesize({ text });

    if (!synthesized.ok) {
      logger.ttsFailure("TTS synthesis failed", {
        route,
        userId: auth.user.id,
        source: source.data,
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
