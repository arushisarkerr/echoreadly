"use client";

import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type UIEvent,
} from "react";

import { formatPageCitations } from "@/features/citations";
import { cn } from "@/utils";

import type { ChatMessage } from "./types";
import { useChat } from "./use-chat";

/**
 * Lightweight presentation for chat text — fences + inline code only.
 * Does not change model output or prompts.
 */
function MessageBody({ content }: { content: string }) {
  const blocks = splitContentBlocks(content);

  return (
    <div className="space-y-2.5">
      {blocks.map((block, index) => {
        if (block.type === "code") {
          return (
            <pre
              key={index}
              className="overflow-x-auto rounded-xl border border-border/70 bg-background/80 p-3 font-mono text-[0.75rem] leading-relaxed text-foreground"
            >
              <code>{block.value}</code>
            </pre>
          );
        }

        return (
          <p
            key={index}
            className="text-[0.875rem] leading-[1.65] whitespace-pre-wrap text-foreground"
          >
            {renderInlineCode(block.value)}
          </p>
        );
      })}
    </div>
  );
}

function splitContentBlocks(
  content: string,
): Array<{ type: "text" | "code"; value: string }> {
  const parts = content.split(/```/);
  const blocks: Array<{ type: "text" | "code"; value: string }> = [];

  parts.forEach((part, index) => {
    const trimmed = part.replace(/^\s+|\s+$/g, "");
    if (!trimmed && index !== 0 && index !== parts.length - 1) {
      return;
    }
    if (index % 2 === 1) {
      const code = part.replace(/^[a-zA-Z0-9_-]*\n?/, "");
      blocks.push({ type: "code", value: code.replace(/\n$/, "") });
    } else if (trimmed) {
      blocks.push({ type: "text", value: part.replace(/^\n+|\n+$/g, "") });
    }
  });

  if (blocks.length === 0) {
    return [{ type: "text", value: content }];
  }
  return blocks;
}

function renderInlineCode(text: string): ReactNode[] {
  const pieces = text.split(/(`[^`]+`)/g);
  return pieces.map((piece, index) => {
    if (piece.startsWith("`") && piece.endsWith("`") && piece.length > 2) {
      return (
        <code
          key={index}
          className="rounded-md border border-border/60 bg-background/70 px-1 py-0.5 font-mono text-[0.8em]"
        >
          {piece.slice(1, -1)}
        </code>
      );
    }
    return <span key={index}>{piece}</span>;
  });
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  const citation =
    !isUser && message.pages ? formatPageCitations(message.pages) : null;
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">(
    "idle",
  );

  async function copyMessage() {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 2000);
    } catch {
      setCopyState("failed");
      window.setTimeout(() => setCopyState("idle"), 2500);
    }
  }

  return (
    <div
      className={cn("flex", isUser ? "justify-end" : "justify-start")}
      role="listitem"
    >
      <div
        className={cn(
          "max-w-[min(100%,22rem)] rounded-2xl border px-3.5 py-2.5",
          isUser
            ? "border-foreground/15 bg-foreground text-background"
            : "border-border/70 bg-background/55 text-foreground",
        )}
      >
        <p
          className={cn(
            "mb-1.5 text-[0.65rem] font-semibold tracking-[0.14em] uppercase",
            isUser ? "text-background/55" : "text-subtle",
          )}
        >
          {isUser ? "You" : "EchoReadly"}
        </p>

        <div className={isUser ? "[&_code]:border-background/20 [&_code]:bg-background/15 [&_pre]:border-background/20 [&_pre]:bg-background/10" : undefined}>
          {message.content.trim() ? (
            <MessageBody content={message.content} />
          ) : message.streaming ? (
            <span className="inline-flex items-center gap-2 text-sm text-muted">
              <span className="flex gap-1" aria-hidden="true">
                <span className="size-1.5 animate-pulse rounded-full bg-accent" />
                <span
                  className="size-1.5 animate-pulse rounded-full bg-accent"
                  style={{ animationDelay: "0.15s" }}
                />
                <span
                  className="size-1.5 animate-pulse rounded-full bg-accent"
                  style={{ animationDelay: "0.3s" }}
                />
              </span>
              Writing…
            </span>
          ) : (
            <MessageBody content={message.content} />
          )}
          {message.streaming && message.content.trim() ? (
            <span className="mt-1 inline-block h-3 w-0.5 animate-pulse bg-accent align-middle" aria-hidden="true" />
          ) : null}
        </div>

        {citation ? (
          <p
            className={cn(
              "mt-2 inline-flex rounded-full border px-2 py-0.5 text-[0.7rem] font-medium",
              isUser
                ? "border-background/25 text-background/70"
                : "border-border/70 text-subtle",
            )}
          >
            {citation}
          </p>
        ) : null}

        {!isUser && !message.streaming ? (
          <div className="mt-2.5 flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                void copyMessage();
              }}
              className="inline-flex h-7 items-center rounded-full border border-border/70 bg-surface/60 px-2.5 text-[0.65rem] font-semibold text-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {copyState === "copied"
                ? "Copied"
                : copyState === "failed"
                  ? "Copy failed"
                  : "Copy"}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function ChatHistory() {
  const { messages, status, error, retryLast, clearError } = useChat();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);

  useEffect(() => {
    if (!stickToBottomRef.current) {
      return;
    }
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, status, error]);

  function onScroll(event: UIEvent<HTMLDivElement>) {
    const el = event.currentTarget;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    stickToBottomRef.current = distance < 96;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        ref={scrollerRef}
        onScroll={onScroll}
        role="list"
        aria-label="Chat messages"
        className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain pr-1"
      >
        {messages.length === 0 && status !== "loading" ? (
          <div className="rounded-[1.25rem] border border-dashed border-border/80 bg-surface/40 px-4 py-10 text-center">
            <p className="font-display text-base font-semibold text-foreground">
              Ask about this document
            </p>
            <p className="mx-auto mt-2 max-w-[16rem] text-sm leading-relaxed text-muted">
              Questions stay in this session only. Press Enter to send,
              Shift+Enter for a new line.
            </p>
          </div>
        ) : null}

        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))}

        {status === "loading" &&
        !messages.some((message) => message.streaming) ? (
          <div className="flex justify-start" role="status" aria-live="polite">
            <div className="max-w-[85%] rounded-2xl border border-border/70 bg-background/55 px-3.5 py-3 text-sm">
              <span className="inline-flex items-center gap-2 text-muted">
                <span className="flex gap-1" aria-hidden="true">
                  <span className="size-1.5 animate-pulse rounded-full bg-accent" />
                  <span
                    className="size-1.5 animate-pulse rounded-full bg-accent"
                    style={{ animationDelay: "0.15s" }}
                  />
                  <span
                    className="size-1.5 animate-pulse rounded-full bg-accent"
                    style={{ animationDelay: "0.3s" }}
                  />
                </span>
                Thinking…
              </span>
            </div>
          </div>
        ) : null}

        {error ? (
          <div
            role="alert"
            className="rounded-[1.25rem] border border-danger/30 bg-[color-mix(in_srgb,var(--danger)_8%,transparent)] px-4 py-3"
          >
            <p className="text-sm font-semibold text-foreground">
              Reply unavailable
            </p>
            <p className="mt-1 text-sm leading-relaxed text-muted">{error}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  void retryLast();
                }}
                className="inline-flex h-9 items-center justify-center rounded-full bg-foreground px-3.5 text-xs font-semibold text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Try again
              </button>
              <button
                type="button"
                onClick={clearError}
                className="inline-flex h-9 items-center justify-center rounded-full border border-border px-3.5 text-xs font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Dismiss
              </button>
            </div>
          </div>
        ) : null}

        <div ref={bottomRef} aria-hidden="true" className="h-px" />
      </div>
    </div>
  );
}
