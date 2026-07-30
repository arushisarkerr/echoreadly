/**
 * Document Q&A chat with page citations.
 * Hardened: auth, rate limits, payload validation, structured errors, logging.
 */

import { serverEnv } from "@/config";
import {
  createOpenAiProvider,
  getSharedGeminiFallbackProvider,
  shouldFallbackToGemini,
  summarizeErrorType,
  type AiProvider,
} from "@/features/ai";
import {
  collectAllowedPages,
  parseCitedAnswer,
} from "@/features/citations";
import {
  NOT_FOUND_IN_DOCUMENT,
  DEFAULT_CHAT_MAX_OUTPUT_TOKENS,
  buildChatInput,
  buildChatInstructions,
  formatChatContext,
} from "@/features/chat/prompts";
import { ensureDocumentProcessed } from "@/features/processing";
import { logger } from "@/lib/logger";
import {
  apiError,
  apiSuccess,
  enforceRateLimit,
  getRequestIp,
  mapDomainFailure,
  rateLimitedResponse,
  validateChatHistory,
  validateChatQuestion,
  validateFileName,
  validateStoragePath,
} from "@/lib/security";
import { requireUser } from "@/server/auth";

type ChatRequestBody = {
  storagePath?: unknown;
  question?: unknown;
  history?: unknown;
  originalFileName?: unknown;
};

function getFileNameFromStoragePath(storagePath: string): string {
  const segments = storagePath.split("/");
  return segments[segments.length - 1] || "document.pdf";
}

export async function POST(request: Request) {
  const route = "/api/documents/chat";

  const auth = await requireUser();
  if (!auth.ok) {
    return apiError("UNAUTHORIZED", auth.error, auth.status);
  }

  const rate = enforceRateLimit({
    bucket: "chat",
    userId: auth.user.id,
    ip: getRequestIp(request),
  });

  if (!rate.ok) {
    logger.warn("Chat rate limited", {
      route,
      userId: auth.user.id,
      limitedBy: rate.limitedBy,
    });
    return rateLimitedResponse(rate);
  }

  let body: ChatRequestBody;

  try {
    body = (await request.json()) as ChatRequestBody;
  } catch {
    return apiError("VALIDATION", "Invalid request body.", 400);
  }

  const storagePath = validateStoragePath(body.storagePath);
  if (!storagePath.ok) {
    return apiError(storagePath.code, storagePath.message, 400);
  }

  const question = validateChatQuestion(body.question);
  if (!question.ok) {
    return apiError(question.code, question.message, 400);
  }

  const history = validateChatHistory(body.history);
  if (!history.ok) {
    return apiError(history.code, history.message, 400);
  }

  const originalFileName = validateFileName(body.originalFileName);
  if (!originalFileName.ok) {
    return apiError(originalFileName.code, originalFileName.message, 400);
  }

  try {
    const processed = await ensureDocumentProcessed({
      storagePath: storagePath.data,
      originalFileName:
        originalFileName.data ?? getFileNameFromStoragePath(storagePath.data),
    });

    if (!processed.ok) {
      logger.processingFailure("Chat document processing failed", {
        route,
        userId: auth.user.id,
        storagePath: storagePath.data,
      }, processed.error);

      return mapDomainFailure(processed.error, "processing");
    }

    const context = formatChatContext(processed.data.chunks);
    const allowedPages = collectAllowedPages(
      processed.data.chunks.chunks.map((chunk) => chunk.pageNumber),
    );

    if (!context) {
      return apiSuccess({
        content: NOT_FOUND_IN_DOCUMENT,
        pages: [],
        generatedAt: new Date().toISOString(),
        model: "none",
      });
    }

    const promptHistory = (() => {
      if (!history.data.length) return [];
      const last = history.data[history.data.length - 1];
      if (last.role === "user" && last.content.trim() === question.data) {
        return history.data.slice(0, -1);
      }
      return history.data;
    })();

    const provider: AiProvider = createOpenAiProvider(serverEnv.openAiApiKey);
    const instructions = buildChatInstructions();
    const promptInput = buildChatInput({
      context,
      history: promptHistory,
      question: question.data,
    });

    let generation = await provider.generateText({
      instructions,
      input: promptInput,
      maxOutputTokens: DEFAULT_CHAT_MAX_OUTPUT_TOKENS,
    });

    if (
      !generation.ok &&
      shouldFallbackToGemini(generation.error) &&
      provider.name !== "gemini"
    ) {
      const fallback = getSharedGeminiFallbackProvider();
      if (fallback.isConfigured()) {
        logger.warn("Chat falling back to Gemini", {
          primaryProvider: provider.name,
          fallbackProvider: "gemini",
          errorType: summarizeErrorType(generation.error),
        });

        generation = await fallback.generateText({
          instructions,
          input: promptInput,
          // Use Gemini's own default model — never reuse the OpenAI model id.
          maxOutputTokens: DEFAULT_CHAT_MAX_OUTPUT_TOKENS,
        });

        if (generation.ok) {
          logger.info("Chat Gemini fallback succeeded", {
            provider: "gemini",
            reason: "fallback_from_openai",
          });
        } else {
          logger.error("Chat Gemini fallback failed", {
            provider: "gemini",
            originalProvider: "openai",
            errorType: summarizeErrorType(generation.error),
          });
        }
      }
    }

    if (!generation.ok) {
      logger.aiFailure("Chat generation failed", {
        route,
        userId: auth.user.id,
        storagePath: storagePath.data,
      }, generation.error.message);
      return mapDomainFailure(generation.error.message, "ai");
    }

    const cited = parseCitedAnswer(generation.data.text, allowedPages);
    const isNotFound =
      cited.answer.trim() === NOT_FOUND_IN_DOCUMENT ||
      cited.answer.toLowerCase().includes("couldn't find that information");

    return apiSuccess({
      content: cited.answer,
      pages: isNotFound ? [] : cited.pages,
      generatedAt: new Date().toISOString(),
      model: generation.data.model,
    });
  } catch (error) {
    logger.aiFailure("Chat threw", {
      route,
      userId: auth.user.id,
      storagePath: storagePath.data,
    }, error);
    return apiError(
      "AI_ERROR",
      "Unable to complete the AI request. Please try again.",
      500,
    );
  }
}
