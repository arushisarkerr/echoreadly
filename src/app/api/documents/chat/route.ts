/**
 * Document Q&A chat with page citations — buffered or SSE streaming.
 */

import { serverEnv } from "@/config";
import {
  createOpenAiProvider,
  getSharedGeminiFallbackProvider,
  shouldFallbackToGemini,
  summarizeErrorType,
  type AiProvider,
} from "@/features/ai";
import { createSseResponse } from "@/features/ai/sse";
import { streamTextWithFallback } from "@/features/ai/stream-text";
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
  stream?: unknown;
};

function getFileNameFromStoragePath(storagePath: string): string {
  const segments = storagePath.split("/");
  return segments[segments.length - 1] || "document.pdf";
}

function wantsStream(request: Request, body: ChatRequestBody): boolean {
  if (body.stream === true || body.stream === "true") {
    return true;
  }
  const accept = request.headers.get("accept") ?? "";
  return accept.includes("text/event-stream");
}

export async function POST(request: Request) {
  const route = "/api/documents/chat";

  const auth = await requireUser();
  if (!auth.ok) {
    return apiError("UNAUTHORIZED", auth.error, auth.status);
  }

  const gate = await requireFeatureAndQuota(auth.user.id, "chat", "chat");
  if (!gate.ok) {
    return gate.response;
  }

  const rate = await enforceRateLimit({
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

  const stream = wantsStream(request, body);

  try {
    const processed = await ensureDocumentProcessed({
      storagePath: storagePath.data,
      originalFileName:
        originalFileName.data ?? getFileNameFromStoragePath(storagePath.data),
    });

    if (!processed.ok) {
      logger.processingFailure(
        "Chat document processing failed",
        {
          route,
          userId: auth.user.id,
          storagePath: storagePath.data,
        },
        processed.error,
      );

      return mapDomainFailure(processed.error, "processing");
    }

    const context = formatChatContext(processed.data.chunks);
    const allowedPages = collectAllowedPages(
      processed.data.chunks.chunks.map((chunk) => chunk.pageNumber),
    );

    if (!context) {
      const empty = {
        content: NOT_FOUND_IN_DOCUMENT,
        pages: [] as number[],
        generatedAt: new Date().toISOString(),
        model: "none",
      };
      if (!stream) {
        return apiSuccess(empty);
      }
      return createSseResponse({
        signal: request.signal,
        run: async (emit) => {
          emit("meta", { kind: "chat", cached: false });
          emit("delta", { text: empty.content });
          emit("done", empty);
        },
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

    if (!stream) {
      let generation = await provider.generateText({
        instructions,
        input: promptInput,
        maxOutputTokens: DEFAULT_CHAT_MAX_OUTPUT_TOKENS,
        signal: request.signal,
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
            maxOutputTokens: DEFAULT_CHAT_MAX_OUTPUT_TOKENS,
            signal: request.signal,
          });
        }
      }

      if (!generation.ok) {
        logger.aiFailure(
          "Chat generation failed",
          {
            route,
            userId: auth.user.id,
            storagePath: storagePath.data,
          },
          generation.error.message,
        );
        return mapDomainFailure(generation.error.message, "ai");
      }

      const cited = parseCitedAnswer(generation.data.text, allowedPages);
      const isNotFound =
        cited.answer.trim() === NOT_FOUND_IN_DOCUMENT ||
        cited.answer.toLowerCase().includes("couldn't find that information");

      try {
        await recordUsage(auth.user.id, "chat", gate.entitlement);
      } catch (error) {
        logger.warn(
          "Chat usage record failed",
          {
            route,
            userId: auth.user.id,
          },
          error,
        );
      }

      return apiSuccess({
        content: cited.answer,
        pages: isNotFound ? [] : cited.pages,
        generatedAt: new Date().toISOString(),
        model: generation.data.model,
      });
    }

    return createSseResponse({
      signal: request.signal,
      run: async (emit) => {
        emit("meta", { kind: "chat", cached: false });

        let finalText = "";
        let model = "unknown";

        for await (const chunk of streamTextWithFallback(
          provider,
          {
            instructions,
            input: promptInput,
            maxOutputTokens: DEFAULT_CHAT_MAX_OUTPUT_TOKENS,
            signal: request.signal,
          },
          { route },
        )) {
          if (request.signal.aborted) {
            return;
          }
          if (chunk.type === "delta") {
            emit("delta", { text: chunk.text });
            continue;
          }
          if (chunk.type === "error") {
            emit("error", {
              message: chunk.error.message,
              code: chunk.error.code,
            });
            return;
          }
          if (chunk.type === "done") {
            finalText = chunk.text;
            model = chunk.model;
          }
        }

        if (request.signal.aborted) {
          return;
        }

        const cited = parseCitedAnswer(finalText, allowedPages);
        const isNotFound =
          cited.answer.trim() === NOT_FOUND_IN_DOCUMENT ||
          cited.answer
            .toLowerCase()
            .includes("couldn't find that information");

        try {
          await recordUsage(auth.user.id, "chat", gate.entitlement);
        } catch (error) {
          logger.warn(
            "Chat usage record failed",
            {
              route,
              userId: auth.user.id,
            },
            error,
          );
        }

        emit("done", {
          content: cited.answer,
          pages: isNotFound ? [] : cited.pages,
          generatedAt: new Date().toISOString(),
          model,
        });
      },
    });
  } catch (error) {
    logger.aiFailure(
      "Chat threw",
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
