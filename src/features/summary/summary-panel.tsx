"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";

import { CloseIcon } from "@/components/icons";
import type { TargetLanguageCode } from "@/constants";
import { cn } from "@/utils";
import type { SummaryType } from "@/features/ai";
import { ChatPanel } from "@/features/chat";
import { TranslationPanel } from "@/features/translation";

import { SummaryButtons } from "./summary-buttons";
import { SummaryContent } from "./summary-content";
import { useSummary } from "./use-summary";

type SummaryPanelProps = {
  storagePath: string;
  fileName: string;
  pageNumber: number;
  open: boolean;
  onClose: () => void;
  listenDisabled?: boolean;
  onListenSummary?: (input: {
    documentId: string;
    summaryType: SummaryType;
    targetLanguage?: TargetLanguageCode;
  }) => void;
  onListenPageTranslated?: (input: {
    storagePath: string;
    pageNumber: number;
    originalFileName?: string;
    targetLanguage: TargetLanguageCode;
  }) => void;
  exportDisabled?: boolean;
  exportStatus?: "idle" | "exporting" | "success" | "error";
  exportError?: string | null;
  exportFileName?: string | null;
  onExportSummary?: (input: {
    documentId: string;
    summaryType: SummaryType;
    targetLanguage?: TargetLanguageCode;
  }) => void;
  onExportPageTranslated?: (input: {
    storagePath: string;
    pageNumber: number;
    originalFileName?: string;
    targetLanguage: TargetLanguageCode;
  }) => void;
};

type StudioTab = "listen" | "language" | "advanced";

const TAB_ORDER: StudioTab[] = ["listen", "language", "advanced"];

/**
 * Listen options panel — modes, listening language, advanced ask.
 */
export function SummaryPanel({
  storagePath,
  fileName,
  pageNumber,
  open,
  onClose,
  listenDisabled = false,
  onListenSummary,
  onListenPageTranslated,
  exportDisabled = false,
  exportStatus = "idle",
  exportError = null,
  exportFileName = null,
  onExportSummary,
  onExportPageTranslated,
}: SummaryPanelProps) {
  const summary = useSummary({ storagePath, fileName });
  const isLoading =
    summary.status === "loading" || summary.status === "streaming";
  const [activeTab, setActiveTab] = useState<StudioTab>("listen");
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const summaryTabId = useId();
  const chatTabId = useId();
  const translateTabId = useId();
  const summaryPanelId = useId();
  const chatPanelId = useId();
  const translatePanelId = useId();

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
    setActiveTab((current) => {
      const index = TAB_ORDER.indexOf(current);
      const next =
        event.key === "ArrowRight"
          ? TAB_ORDER[(index + 1) % TAB_ORDER.length]!
          : TAB_ORDER[(index - 1 + TAB_ORDER.length) % TAB_ORDER.length]!;
      return next;
    });
  }

  const panelBody = (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-start justify-between gap-3 border-b border-border/60 px-4 py-4">
        <div className="min-w-0">
          <p className="text-[0.6rem] font-semibold tracking-[0.18em] text-accent uppercase">
            Listen
          </p>
          <h2
            id={titleId}
            className="mt-1 font-display text-lg font-semibold tracking-tight text-foreground"
          >
            How do you want to listen?
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            Choose a listening mode or language. Audio stays the focus —
            everything else is optional.
          </p>
        </div>

        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-foreground transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Close listen options"
        >
          <CloseIcon className="size-4" />
        </button>
      </div>

      <div
        className="flex flex-wrap items-center gap-1.5 border-b border-border/60 px-4 py-3"
        role="tablist"
        aria-label="Listen options"
        onKeyDown={onTabListKeyDown}
      >
        <TabButton
          id={summaryTabId}
          controls={summaryPanelId}
          selected={activeTab === "listen"}
          onSelect={() => setActiveTab("listen")}
          label="Modes"
        />
        <TabButton
          id={translateTabId}
          controls={translatePanelId}
          selected={activeTab === "language"}
          onSelect={() => setActiveTab("language")}
          label="Listening Language"
        />
        <TabButton
          id={chatTabId}
          controls={chatPanelId}
          selected={activeTab === "advanced"}
          onSelect={() => setActiveTab("advanced")}
          label="Advanced"
        />
      </div>

      {activeTab === "listen" ? (
        <div
          id={summaryPanelId}
          role="tabpanel"
          aria-labelledby={summaryTabId}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="shrink-0 space-y-3 border-b border-border/50 px-4 py-4">
            <p className="text-[0.65rem] font-semibold tracking-[0.14em] text-subtle uppercase">
              Listening mode
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
              streamingText={summary.streamingText}
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
              onStop={() => {
                summary.stop();
              }}
              onListen={
                onListenSummary
                  ? () => {
                      const current = summary.summary;
                      if (!current?.documentId || !current.summaryType) {
                        return;
                      }
                      onListenSummary({
                        documentId: current.documentId,
                        summaryType: current.summaryType,
                      });
                    }
                  : undefined
              }
              onExport={
                onExportSummary
                  ? () => {
                      const current = summary.summary;
                      if (!current?.documentId || !current.summaryType) {
                        return;
                      }
                      onExportSummary({
                        documentId: current.documentId,
                        summaryType: current.summaryType,
                      });
                    }
                  : undefined
              }
              exportDisabled={exportDisabled}
              exportStatus={exportStatus}
              exportError={exportError}
              exportFileName={exportFileName}
            />
          </div>
        </div>
      ) : activeTab === "language" ? (
        <div
          id={translatePanelId}
          role="tabpanel"
          aria-labelledby={translateTabId}
          className="min-h-0 flex-1 overflow-hidden"
        >
          <TranslationPanel
            storagePath={storagePath}
            fileName={fileName}
            pageNumber={pageNumber}
            summaryDocumentId={summary.summary?.documentId ?? null}
            listenDisabled={listenDisabled}
            exportDisabled={exportDisabled}
            onListenTranslated={(input) => {
              if (input.scope === "page" && onListenPageTranslated) {
                onListenPageTranslated({
                  storagePath: input.storagePath ?? storagePath,
                  pageNumber: input.pageNumber ?? pageNumber,
                  originalFileName: input.originalFileName ?? fileName,
                  targetLanguage: input.targetLanguage,
                });
                return;
              }
              if (
                input.scope === "summary" &&
                onListenSummary &&
                input.documentId &&
                input.summaryType
              ) {
                onListenSummary({
                  documentId: input.documentId,
                  summaryType: input.summaryType,
                  targetLanguage: input.targetLanguage,
                });
              }
            }}
            onExportTranslated={(input) => {
              if (input.scope === "page" && onExportPageTranslated) {
                onExportPageTranslated({
                  storagePath: input.storagePath ?? storagePath,
                  pageNumber: input.pageNumber ?? pageNumber,
                  originalFileName: input.originalFileName ?? fileName,
                  targetLanguage: input.targetLanguage,
                });
                return;
              }
              if (
                input.scope === "summary" &&
                onExportSummary &&
                input.documentId &&
                input.summaryType
              ) {
                onExportSummary({
                  documentId: input.documentId,
                  summaryType: input.summaryType,
                  targetLanguage: input.targetLanguage,
                });
              }
            }}
          />
        </div>
      ) : (
        <div
          id={chatPanelId}
          role="tabpanel"
          aria-labelledby={chatTabId}
          className="min-h-0 flex-1 overflow-hidden px-4 py-4"
        >
          <p className="mb-3 text-xs text-muted">
            Advanced — ask about this document. Optional; listening stays the
            main experience.
          </p>
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
        <div className="min-h-0 flex-1 overflow-hidden">{panelBody}</div>
      </aside>

      <aside
        className={cn(
          "relative hidden min-h-0 w-full max-w-[24rem] shrink-0 flex-col border-l border-border/60 bg-[color-mix(in_srgb,var(--surface)_88%,transparent)] backdrop-blur-xl transition-[width,opacity] lg:flex",
          open ? "opacity-100" : "pointer-events-none w-0 max-w-0 overflow-hidden opacity-0",
        )}
        aria-hidden={!open}
        aria-labelledby={titleId}
      >
        <div className="flex h-full min-h-0 flex-col overflow-hidden">
          {panelBody}
        </div>
      </aside>
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
        "inline-flex h-9 items-center justify-center rounded-full border px-3.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        selected
          ? "border-foreground bg-foreground text-background"
          : "border-border/80 bg-background/40 text-foreground hover:bg-surface-muted",
      )}
    >
      {label}
    </button>
  );
}
