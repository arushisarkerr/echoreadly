"use client";

import { consumeAiSse } from "@/features/ai/consume-sse";
import { getApiErrorMessage } from "@/utils";

import type { ChatAssistantResponse, ChatHistoryItem } from "./types";

export type ChatRequestPayload = {
  storagePath: string;
  question: string;
  history: ChatHistoryItem[];
  originalFileName?: string;
};

export type ChatServiceResult =
  | { ok: true; data: ChatAssistantResponse }
  | { ok: false; error: string; partialText?: string; aborted?: boolean };

export type StreamChatOptions = {
  signal?: AbortSignal;
  onDisplayText?: (text: string) => void;
};

/**
 * Stream a cited chat answer (SSE). Falls back to JSON if the server returns it.
 */
export async function requestChatResponseStream(
  payload: ChatRequestPayload,
  options: StreamChatOptions = {},
): Promise<ChatServiceResult> {
  try {
    const response = await fetch("/api/documents/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      },
      body: JSON.stringify({ ...payload, stream: true }),
      signal: options.signal,
    });

    const result = await consumeAiSse<ChatAssistantResponse>(response, {
      signal: options.signal,
      displayMode: "chat",
      onDisplayText: options.onDisplayText,
    });

    if (!result.ok) {
      return {
        ok: false,
        error: result.error,
        partialText: result.partialText,
        aborted: result.aborted,
      };
    }

    const pages = Array.isArray(result.data.pages)
      ? result.data.pages.filter(
          (page): page is number =>
            typeof page === "number" && Number.isInteger(page) && page >= 1,
        )
      : [];

    return {
      ok: true,
      data: {
        content: result.data.content,
        pages,
        generatedAt: result.data.generatedAt,
        model: result.data.model,
      },
    };
  } catch (error) {
    if (options.signal?.aborted) {
      return {
        ok: false,
        error: "Generation stopped.",
        aborted: true,
      };
    }
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to generate chat reply.",
    };
  }
}

/**
 * Buffered chat request (non-stream fallback).
 */
export async function requestChatResponse(
  payload: ChatRequestPayload,
  signal?: AbortSignal,
): Promise<ChatServiceResult> {
  try {
    const response = await fetch("/api/documents/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal,
    });

    const json = (await response.json()) as
      | { ok: true; data: ChatAssistantResponse }
      | { ok: false; error: unknown };

    if (!response.ok || !json.ok) {
      return {
        ok: false,
        error:
          json.ok === false
            ? getApiErrorMessage(json.error, "Unable to generate chat reply.")
            : "Unable to generate chat reply.",
      };
    }

    const pages = Array.isArray(json.data.pages)
      ? json.data.pages.filter(
          (page): page is number =>
            typeof page === "number" && Number.isInteger(page) && page >= 1,
        )
      : [];

    return {
      ok: true,
      data: {
        content: json.data.content,
        pages,
        generatedAt: json.data.generatedAt,
        model: json.data.model,
      },
    };
  } catch (error) {
    if (signal?.aborted) {
      return { ok: false, error: "Generation stopped.", aborted: true };
    }
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to generate chat reply.",
    };
  }
}
