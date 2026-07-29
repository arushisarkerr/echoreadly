"use client";

import { useMemo, useState } from "react";

import { useChat } from "./use-chat";

export function ChatInput() {
  const { status, error, sendMessage, stopGenerating, clearConversation } =
    useChat();

  const [question, setQuestion] = useState("");

  const canSend = useMemo(() => {
    return status !== "loading" && question.trim().length > 0;
  }, [question, status]);

  return (
    <div className="mt-4 border-t border-border pt-4">
      {error ? (
        <p className="mb-3 text-sm text-danger">{error}</p>
      ) : null}

      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          void sendMessage(question);
          setQuestion("");
        }}
      >
        <label className="sr-only" htmlFor="chat-input">
          Ask a question
        </label>
        <textarea
          id="chat-input"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          rows={2}
          className="min-h-[44px] resize-none rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder="Ask about the current document..."
          disabled={status === "loading"}
        />

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="submit"
            disabled={!canSend}
            className="inline-flex h-10 items-center justify-center rounded-md bg-foreground px-4 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Send
          </button>

          {status === "loading" ? (
            <button
              type="button"
              onClick={() => stopGenerating()}
              className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-surface px-4 text-sm font-medium text-foreground transition-colors hover:bg-surface-muted"
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
            className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-surface-muted px-4 text-sm font-medium text-foreground transition-colors hover:bg-surface-muted/70"
          >
            Clear
          </button>
        </div>
      </form>
    </div>
  );
}

