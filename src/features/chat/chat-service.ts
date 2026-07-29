"use client";

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
  | { ok: false; error: string };

/**
 * Request a cited chat answer for the current document.
 * Citations are parsed and validated server-side.
 */
export async function requestChatResponse(
  payload: ChatRequestPayload,
): Promise<ChatServiceResult> {
  const response = await fetch("/api/documents/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
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
}
