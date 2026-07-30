"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";

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

type StudioTab = "summary" | "chat";

/**
 * AI Summary panel for the PDF reader.
 * Desktop: collapsible right sidebar. Mobile: bottom sheet drawer.
 * Live tabs: Summary + Chat only.
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
  const [activeTab, setActiveTab] = useState<StudioTab>("summary");
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const summaryTabId = useId();
  const chatTabId = useId();
  const summaryPanelId = useId();
  const chatPanelId = useId();

  useEffect(() => {
    if (!open) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", onKeyDown);

    const isMobile = window.matchMedia("(max-width: 1023px)").matches;
    if (isMobile) {
      document.body.style.overflow = "hidden";
    }

    const frame = window.requestAnimationFrame(() => {
      closeRef.current?.focus();
    });

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
      window.cancelAnimationFrame(frame);
    };
  }, [onClose, open]);

  function onTabListKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
      return;
    }
    event.preventDefault();
    setActiveTab((current) => (current === "summary" ? "chat" : "summary"));
  }

  const panelBody = (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-start justify-between gap-3 border-b border-border/60 px-4 py-4">
        <div className="min-w-0">
          <p className="text-[0.6rem] font-semibold tracking-[0.18em] text-accent uppercase">
            Studio AI
          </p>
          <h2
            id={titleId}
            className="mt-1 font-display text-lg font-semibold tracking-tight text-foreground"
          >
            Summary & chat
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            Live tools for this document. Generate a summary or ask questions —
            nothing runs until you choose.
          </p>
        </div>

        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-foreground transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Close AI panel"
        >
          <CloseIcon className="size-4" />
        </button>
      </div>

      <div
        className="flex flex-wrap items-center gap-1.5 border-b border-border/60 px-4 py-3"
        role="tablist"
        aria-label="Studio AI tools"
        onKeyDown={onTabListKeyDown}
      >
        <TabButton
          id={summaryTabId}
          controls={summaryPanelId}
          selected={activeTab === "summary"}
          onSelect={() => setActiveTab("summary")}
          label="Summary"
        />
        <TabButton
          id={chatTabId}
          controls={chatPanelId}
          selected={activeTab === "chat"}
          onSelect={() => setActiveTab("chat")}
          label="Chat"
        />
      </div>

      {activeTab === "summary" ? (
        <div
          id={summaryPanelId}
          role="tabpanel"
          aria-labelledby={summaryTabId}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="shrink-0 space-y-3 border-b border-border/50 px-4 py-4">
            <p className="text-[0.65rem] font-semibold tracking-[0.14em] text-subtle uppercase">
              Choose a length
            </p>
            <SummaryButtons
              activeType={summary.activeType}
              disabled={isLoading}
              onSelect={(summaryType) => {
                void summary.generate(summaryType);
              }}
            />
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
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
        </div>
      ) : (
        <div
          id={chatPanelId}
          role="tabpanel"
          aria-labelledby={chatTabId}
          className="min-h-0 flex-1 overflow-hidden px-4 py-4"
        >
          <ChatPanel storagePath={storagePath} fileName={fileName} />
        </div>
      )}
    </div>
  );

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-40 bg-foreground/25 transition-opacity lg:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        aria-hidden={!open}
        onClick={onClose}
      />

      <aside
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 flex max-h-[82vh] flex-col rounded-t-[1.75rem] border border-border/70 bg-[color-mix(in_srgb,var(--surface)_94%,transparent)] shadow-[var(--elevation-md)] backdrop-blur-xl transition-transform duration-300 lg:hidden",
          open ? "translate-y-0" : "translate-y-full",
        )}
        aria-hidden={!open}
        aria-labelledby={titleId}
        aria-modal={open ? true : undefined}
        role="dialog"
      >
        <div className="flex justify-center py-3" aria-hidden="true">
          <span className="h-1 w-10 rounded-full bg-border" />
        </div>
        {panelBody}
      </aside>

      {open ? (
        <aside
          className="hidden h-full w-[22rem] shrink-0 border-l border-border/60 bg-[color-mix(in_srgb,var(--surface)_78%,transparent)] backdrop-blur-xl lg:flex lg:flex-col xl:w-[24rem]"
          aria-labelledby={titleId}
          aria-label="Studio AI sidebar"
        >
          {panelBody}
        </aside>
      ) : null}
    </>
  );
}

function TabButton({
  id,
  controls,
  selected,
  onSelect,
  label,
}: {
  id: string;
  controls: string;
  selected: boolean;
  onSelect: () => void;
  label: string;
}) {
  return (
    <button
      id={id}
      type="button"
      role="tab"
      aria-selected={selected}
      aria-controls={controls}
      tabIndex={selected ? 0 : -1}
      onClick={onSelect}
      className={cn(
        "inline-flex h-9 min-h-9 items-center justify-center rounded-full border px-3.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        selected
          ? "border-foreground bg-foreground text-background"
          : "border-border/80 bg-background/40 text-foreground hover:bg-surface-muted",
      )}
    >
      {label}
    </button>
  );
}
