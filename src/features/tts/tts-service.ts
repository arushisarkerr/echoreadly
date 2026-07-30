/**
 * Client TTS service — requests narration audio from the server API.
 */

import { getApiErrorMessage } from "@/utils";

import type { SummaryType } from "@/features/ai";

import type { TtsSource } from "./types";

export type TtsRequestPayload =
  | {
      source: "summary";
      documentId: string;
      summaryType: SummaryType;
    }
  | {
      source: "page";
      storagePath: string;
      pageNumber: number;
      originalFileName?: string;
    };

export type TtsServiceResult =
  | {
      ok: true;
      data: {
        blob: Blob;
        mimeType: string;
        source: TtsSource;
        characterCount: number;
      };
    }
  | { ok: false; error: string };

/**
 * Request synthesized audio for summary text or a PDF page.
 */
export async function requestTtsAudio(
  payload: TtsRequestPayload,
): Promise<TtsServiceResult> {
  const response = await fetch("/api/documents/tts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const contentType = response.headers.get("content-type") ?? "";

  if (!response.ok) {
    if (contentType.includes("application/json")) {
      const json = (await response.json()) as { error?: unknown };
      return {
        ok: false,
        error: getApiErrorMessage(json.error, "Unable to generate speech."),
      };
    }

    return {
      ok: false,
      error: "Unable to generate speech.",
    };
  }

  if (!contentType.includes("audio/")) {
    const json = (await response.json()) as
      | { ok: false; error: unknown }
      | { ok: true };

    if (!("ok" in json) || !json.ok) {
      return {
        ok: false,
        error:
          "error" in json
            ? getApiErrorMessage(json.error, "Unable to generate speech.")
            : "Unable to generate speech.",
      };
    }

    return { ok: false, error: "Unexpected TTS response." };
  }

  const blob = await response.blob();
  const characterCountHeader = response.headers.get("x-tts-character-count");
  const sourceHeader = response.headers.get("x-tts-source");

  return {
    ok: true,
    data: {
      blob,
      mimeType: contentType.split(";")[0]?.trim() || "audio/mpeg",
      source: sourceHeader === "page" ? "page" : "summary",
      characterCount: characterCountHeader
        ? Number(characterCountHeader) || 0
        : 0,
    },
  };
}

/**
 * Build page narration text from extracted page chunks.
 */
export function joinPageChunkText(
  chunks: Array<{ pageNumber: number; text: string }>,
  pageNumber: number,
): string {
  return chunks
    .filter((chunk) => chunk.pageNumber === pageNumber)
    .map((chunk) => chunk.text.trim())
    .filter((text) => text.length > 0)
    .join("\n\n");
}
