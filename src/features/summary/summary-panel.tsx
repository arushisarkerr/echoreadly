"use client";

import { useEffect, useState } from "react";

import { CloseIcon } from "@/components/icons";
import { cn } from "@/utils";
import { ChatPanel } from "@/features/chat";

import { SummaryButtons } from "./summary-buttons";
import { SummaryContent } from "./summary-content";
import { useSummary } from "./use-summary";

type SummaryPanelProps = {
  storagePath: string;
  fileName: string;
  open: boolean;
  onClose: () => void;
  listenDisabled?: boolean;
  onListenSummary?: (text: string) => void;
};

/**
 * AI Summary panel for the PDF reader.
 * Desktop: collapsible right sidebar. Mobile: bottom sheet drawer.
 */
export function SummaryPanel({
  storagePath,
  fileName,
  open,
  onClose,
  listenDisabled = false,
  onListenSummary,
}: SummaryPanelProps) {
  const summary = useSummary({ storagePath, fileName });
  const isLoading = summary.status === "loading";
  const [activeTab, setActiveTab] = useState<"summary" | "chat">("summary");

  useEffect(() => {
    if (!open) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    const isMobile = window.matchMedia("(max-width: 1023px)").matches;

    if (isMobile) {
      document.addEventListener("keydown", onKeyDown);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose, open]);

  const panelBody = (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-start justify-between gap-3 px-4 py-4">
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-foreground">
            AI Summary
          </h2>
          <p className="mt-1 text-xs text-muted">
            Generate on demand — nothing runs until you choose a type.
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-md text-foreground transition-colors hover:bg-surface-muted"
          aria-label="Close summary panel"
        >
          <CloseIcon className="size-4" />
        </button>
      </div>

      <div className="flex gap-2 border-b border-border px-4 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab("summary")}
          className={cn(
            "inline-flex h-9 items-center justify-center rounded-md border px-3 text-xs font-medium transition-colors",
            activeTab === "summary"
              ? "border-foreground/20 bg-surface-muted text-foreground"
              : "border-border bg-surface text-foreground hover:bg-surface-muted",
          )}
        >
          Summary
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("chat")}
          className={cn(
            "inline-flex h-9 items-center justify-center rounded-md border px-3 text-xs font-medium transition-colors",
            activeTab === "chat"
              ? "border-foreground/20 bg-surface-muted text-foreground"
              : "border-border bg-surface text-foreground hover:bg-surface-muted",
          )}
        >
          Chat
        </button>
      </div>

      {activeTab === "summary" ? (
        <>
          <div className="space-y-4 px-4 py-4">
            <SummaryButtons
              activeType={summary.activeType}
              disabled={isLoading}
              onSelect={(summaryType) => {
                void summary.generate(summaryType);
              }}
            />
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            <SummaryContent
              status={summary.status}
              summary={summary.summary}
              error={summary.error}
              copyState={summary.copyState}
              listenDisabled={listenDisabled}
              onRegenerate={() => {
                void summary.regenerate();
              }}
              onCopy={() => {
                void summary.copySummary();
              }}
              onRetry={() => {
                if (summary.activeType) {
                  void summary.generate(summary.activeType);
                }
              }}
              onListen={
                onListenSummary
                  ? () => {
                      const text = summary.summary?.content?.trim();
                      if (text) {
                        onListenSummary(text);
                      }
                    }
                  : undefined
              }
            />
          </div>
        </>
      ) : (
        <div className="min-h-0 flex-1 overflow-hidden px-4 py-4">
          <ChatPanel storagePath={storagePath} fileName={fileName} />
        </div>
      )}
    </div>
  );

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-40 bg-foreground/20 transition-opacity lg:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        aria-hidden={!open}
        onClick={onClose}
      />

      <aside
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 flex max-h-[78vh] flex-col rounded-t-2xl border border-border bg-background shadow-md transition-transform duration-300 lg:hidden",
          open ? "translate-y-0" : "translate-y-full",
        )}
        aria-hidden={!open}
        aria-label="AI Summary"
      >
        <div className="flex justify-center py-3" aria-hidden="true">
          <span className="h-1 w-10 rounded-full bg-border" />
        </div>
        {panelBody}
      </aside>

      {open ? (
        <aside
          className="hidden h-full w-80 shrink-0 border-l border-border bg-background lg:flex lg:flex-col"
          aria-label="AI Summary"
        >
          {panelBody}
        </aside>
      ) : null}
    </>
  );
}
