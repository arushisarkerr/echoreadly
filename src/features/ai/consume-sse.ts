/**
 * Client SSE consumer for AI streaming endpoints.
 */

import { getApiErrorMessage } from "@/utils";

import {
  extractStreamingDisplayText,
  type StreamingExtractMode,
} from "./extract-streaming-text";

export type AiSseMeta = {
  cached?: boolean;
  kind?: string;
  [key: string]: unknown;
};

export type ConsumeAiSseOptions = {
  signal?: AbortSignal;
  displayMode?: StreamingExtractMode;
  onMeta?: (meta: AiSseMeta) => void;
  onDisplayText?: (text: string) => void;
  onRawDelta?: (delta: string, accumulated: string) => void;
};

export type ConsumeAiSseResult<TDone> =
  | { ok: true; data: TDone; displayText: string; aborted: false }
  | { ok: false; error: string; partialText: string; aborted: boolean };

function parseSseBlocks(buffer: string): {
  events: Array<{ event: string; data: string }>;
  rest: string;
} {
  const events: Array<{ event: string; data: string }> = [];
  const parts = buffer.split("\n\n");
  const rest = parts.pop() ?? "";

  for (const part of parts) {
    if (!part.trim()) {
      continue;
    }
    let event = "message";
    const dataLines: string[] = [];
    for (const line of part.split("\n")) {
      if (line.startsWith("event:")) {
        event = line.slice(6).trim();
      } else if (line.startsWith("data:")) {
        dataLines.push(line.slice(5).trim());
      }
    }
    events.push({ event, data: dataLines.join("\n") });
  }

  return { events, rest };
}

/**
 * Consume an AI SSE response. Supports abort and partial recovery.
 */
export async function consumeAiSse<TDone = Record<string, unknown>>(
  response: Response,
  options: ConsumeAiSseOptions = {},
): Promise<ConsumeAiSseResult<TDone>> {
  if (!response.ok) {
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      try {
        const json = (await response.json()) as { error?: unknown };
        return {
          ok: false,
          error: getApiErrorMessage(json.error, "Unable to generate."),
          partialText: "",
          aborted: false,
        };
      } catch {
        // fall through
      }
    }
    return {
      ok: false,
      error: "Unable to generate.",
      partialText: "",
      aborted: false,
    };
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("text/event-stream")) {
    // Non-stream JSON success (e.g. cached translation/summary).
    try {
      const json = (await response.json()) as
        | { ok: true; data: TDone }
        | { ok: false; error?: unknown };
      if (!json.ok) {
        return {
          ok: false,
          error: getApiErrorMessage(json.error, "Unable to generate."),
          partialText: "",
          aborted: false,
        };
      }
      return {
        ok: true,
        data: json.data,
        displayText: "",
        aborted: false,
      };
    } catch {
      return {
        ok: false,
        error: "Unable to parse response.",
        partialText: "",
        aborted: false,
      };
    }
  }

  if (!response.body) {
    return {
      ok: false,
      error: "Streaming is unavailable.",
      partialText: "",
      aborted: false,
    };
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let accumulated = "";
  let displayText = "";
  let donePayload: TDone | null = null;
  let streamError: string | null = null;

  try {
    while (true) {
      if (options.signal?.aborted) {
        await reader.cancel();
        return {
          ok: false,
          error: "Generation stopped.",
          partialText: displayText || accumulated,
          aborted: true,
        };
      }

      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const parsed = parseSseBlocks(buffer);
      buffer = parsed.rest;

      for (const evt of parsed.events) {
        let data: unknown = null;
        try {
          data = evt.data ? JSON.parse(evt.data) : null;
        } catch {
          data = evt.data;
        }

        if (evt.event === "meta" && data && typeof data === "object") {
          options.onMeta?.(data as AiSseMeta);
          continue;
        }

        if (evt.event === "delta" && data && typeof data === "object") {
          const text =
            typeof (data as { text?: unknown }).text === "string"
              ? (data as { text: string }).text
              : "";
          if (!text) {
            continue;
          }
          accumulated += text;
          options.onRawDelta?.(text, accumulated);
          if (options.displayMode) {
            displayText = extractStreamingDisplayText(
              accumulated,
              options.displayMode,
            );
            if (options.displayMode === "plain") {
              displayText = accumulated;
            }
            options.onDisplayText?.(displayText);
          } else {
            displayText = accumulated;
            options.onDisplayText?.(displayText);
          }
          continue;
        }

        if (evt.event === "done" && data) {
          donePayload = data as TDone;
          continue;
        }

        if (evt.event === "error" && data && typeof data === "object") {
          streamError = getApiErrorMessage(
            data,
            "Streaming generation failed.",
          );
        }
      }
    }
  } catch (error) {
    if (options.signal?.aborted) {
      return {
        ok: false,
        error: "Generation stopped.",
        partialText: displayText || accumulated,
        aborted: true,
      };
    }
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Streaming connection failed.",
      partialText: displayText || accumulated,
      aborted: false,
    };
  }

  if (streamError) {
    return {
      ok: false,
      error: streamError,
      partialText: displayText || accumulated,
      aborted: false,
    };
  }

  if (!donePayload) {
    if (displayText || accumulated) {
      return {
        ok: false,
        error: "Response ended early. You can retry to continue.",
        partialText: displayText || accumulated,
        aborted: Boolean(options.signal?.aborted),
      };
    }
    return {
      ok: false,
      error: "No response received.",
      partialText: "",
      aborted: false,
    };
  }

  return {
    ok: true,
    data: donePayload,
    displayText: displayText || accumulated,
    aborted: false,
  };
}
