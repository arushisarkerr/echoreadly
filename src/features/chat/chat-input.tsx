"use client";

import { useMemo, useState, type KeyboardEvent } from "react";

import { cn } from "@/utils";

import { useChat } from "./use-chat";

export function ChatInput() {
  const {
    status,
    error,
    sendMessage,
    stopGenerating,
    clearConversation,
    clearError,
  } = useChat();

  const [question, setQuestion] = useState("");
  const loading = status === "loading";

  const canSend = useMemo(() => {
    return !loading && question.trim().length > 0;
  }, [question, loading]);

  async function submit() {
    const trimmed = question.trim();
    if (!trimmed || loading) {
      return;
    }
    clearError();
    setQuestion("");
    await sendMessage(trimmed);
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void submit();
    }
  }

  return (
    <div className="mt-3 shrink-0 border-t border-border/60 pt-3">
      <form
        className="flex flex-col gap-2.5"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <label className="sr-only" htmlFor="chat-input">
          Ask a question about this document
        </label>
        <textarea
          id="chat-input"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={onKeyDown}
          rows={2}
          enterKeyHint="send"
          className={cn(
            "min-h-11 resize-none rounded-2xl border border-border/80 bg-background/60 px-3.5 py-2.5 text-sm text-foreground placeholder:text-subtle",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            "disabled:cursor-not-allowed disabled:opacity-60",
          )}
          placeholder="Ask about the current document…"
          disabled={loading}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "chat-input-error" : "chat-input-hint"}
        />
        <p id="chat-input-hint" className="text-[0.65rem] text-subtle">
          Enter to send · Shift+Enter for a new line
        </p>
        {error ? (
          <p id="chat-input-error" className="sr-only">
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="submit"
            disabled={!canSend}
            className="inline-flex h-10 min-h-10 items-center justify-center rounded-full bg-foreground px-4 text-sm font-semibold text-background transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-55"
          >
            Send
          </button>

          {loading ? (
            <button
              type="button"
              onClick={() => stopGenerating()}
              className="inline-flex h-10 min-h-10 items-center justify-center rounded-full border border-border bg-surface px-4 text-sm font-semibold text-foreground transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Stop
            </button>
          ) : null}

          <button
            type="button"
            onClick={() => {
              setQuestion("");
              clearConversation();
            }}
            disabled={loading}
            className="inline-flex h-10 min-h-10 items-center justify-center rounded-full border border-border/80 bg-background/40 px-4 text-sm font-semibold text-muted transition-colors hover:bg-surface-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-55"
          >
            Clear
          </button>
        </div>
      </form>
    </div>
  );
}
