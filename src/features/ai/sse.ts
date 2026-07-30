/**
 * SSE helpers for AI streaming Route Handlers.
 */

export type SseEventName = "meta" | "delta" | "done" | "error";

const encoder = new TextEncoder();

export function formatSseEvent(
  event: SseEventName,
  data: unknown,
): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export type SseStreamHandlers = {
  signal?: AbortSignal;
  /** Soft timeout in ms (default 120s). */
  timeoutMs?: number;
  run: (emit: (event: SseEventName, data: unknown) => void) => Promise<void>;
};

/**
 * Build a text/event-stream Response. Auth/gating must complete before calling.
 */
export function createSseResponse(handlers: SseStreamHandlers): Response {
  const timeoutMs = handlers.timeoutMs ?? 120_000;
  let closed = false;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (event: SseEventName, data: unknown) => {
        if (closed) {
          return;
        }
        controller.enqueue(encoder.encode(formatSseEvent(event, data)));
      };

      const timeout = setTimeout(() => {
        if (closed) {
          return;
        }
        emit("error", {
          message: "Generation timed out. Please try again.",
          code: "timeout",
        });
        closed = true;
        try {
          controller.close();
        } catch {
          // already closed
        }
      }, timeoutMs);

      const onAbort = () => {
        if (closed) {
          return;
        }
        closed = true;
        clearTimeout(timeout);
        try {
          controller.close();
        } catch {
          // already closed
        }
      };

      handlers.signal?.addEventListener("abort", onAbort, { once: true });

      try {
        await handlers.run(emit);
      } catch (error) {
        if (!closed && handlers.signal?.aborted) {
          // Client cancelled — no error event needed.
        } else if (!closed) {
          emit("error", {
            message:
              error instanceof Error
                ? error.message
                : "Streaming generation failed.",
            code: "ai_error",
          });
        }
      } finally {
        clearTimeout(timeout);
        handlers.signal?.removeEventListener("abort", onAbort);
        if (!closed) {
          closed = true;
          try {
            controller.close();
          } catch {
            // already closed
          }
        }
      }
    },
    cancel() {
      closed = true;
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
