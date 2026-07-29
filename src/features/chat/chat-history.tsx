"use client";

import { formatPageCitations } from "@/features/citations";

import type { ChatMessage } from "./types";
import { useChat } from "./use-chat";

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  const citation =
    !isUser && message.pages
      ? formatPageCitations(message.pages)
      : null;

  return (
    <div className={isUser ? "flex justify-end" : "flex justify-start"}>
      <div
        className={[
          "max-w-[85%] rounded-lg border px-3 py-2 text-sm leading-relaxed",
          isUser
            ? "border-foreground/20 bg-surface-muted text-foreground"
            : "border-border bg-surface text-foreground",
        ].join(" ")}
      >
        <p className="whitespace-pre-wrap">{message.content}</p>
        {citation ? (
          <p className="mt-2 text-xs font-medium text-subtle">{citation}</p>
        ) : null}
      </div>
    </div>
  );
}

export function ChatHistory() {
  const { messages, status } = useChat();

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 overflow-y-auto space-y-3">
        {messages.length === 0 ? (
          <div className="rounded-md border border-dashed border-border bg-surface-muted/30 px-4 py-8 text-center">
            <p className="text-sm font-medium text-foreground">
              Ask a question about this document.
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Your conversation stays only in your current session.
            </p>
          </div>
        ) : null}

        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))}

        {status === "loading" ? (
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-lg border border-border bg-surface px-3 py-2 text-sm">
              <span className="inline-flex items-center gap-2">
                <span className="h-2 w-2 animate-pulse rounded-full bg-muted" />
                Thinking...
              </span>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
