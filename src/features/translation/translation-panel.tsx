"use client";

import {
  DEFAULT_TARGET_LANGUAGE,
  TARGET_LANGUAGE_CATALOG,
  getTargetLanguageDefinition,
  type TargetLanguageCode,
} from "@/constants";
import { cn } from "@/utils";

import { useTranslate } from "./use-translate";
import type { TranslationScope } from "./types";

type TranslationPanelProps = {
  storagePath: string;
  fileName: string;
  pageNumber: number;
  summaryDocumentId?: string | null;
  listenDisabled?: boolean;
  exportDisabled?: boolean;
  onListenTranslated?: (input: {
    scope: "page" | "summary";
    storagePath?: string;
    pageNumber?: number;
    documentId?: string;
    summaryType?: "short" | "detailed" | "bullet";
    targetLanguage: TargetLanguageCode;
    originalFileName?: string;
  }) => void;
  onExportTranslated?: (input: {
    scope: "page" | "summary";
    storagePath?: string;
    pageNumber?: number;
    documentId?: string;
    summaryType?: "short" | "detailed" | "bullet";
    targetLanguage: TargetLanguageCode;
    originalFileName?: string;
  }) => void;
};

const SCOPES: Array<{ id: TranslationScope; label: string }> = [
  { id: "page", label: "This page" },
  { id: "document", label: "Whole document" },
  { id: "summary", label: "Listen mode text" },
  { id: "selection", label: "Selection" },
];

/**
 * Listening Language controls — same translation engine under the hood.
 */
export function TranslationPanel({
  storagePath,
  fileName,
  pageNumber,
  summaryDocumentId = null,
  listenDisabled = false,
  exportDisabled = false,
  onListenTranslated,
  onExportTranslated,
}: TranslationPanelProps) {
  const translate = useTranslate();
  const busy =
    translate.status === "loading" || translate.status === "streaming";
  const language = getTargetLanguageDefinition(translate.targetLanguage);
  const displayText =
    translate.status === "streaming" ||
    (translate.status === "error" && translate.streamingText)
      ? translate.streamingText
      : translate.viewMode === "original"
        ? translate.result?.sourceText
        : translate.result?.translatedText;

  function runTranslate(regenerate = false) {
    void translate.translate({
      storagePath,
      fileName,
      pageNumber,
      documentId: summaryDocumentId,
      regenerate,
    });
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 space-y-4 border-b border-border/50 px-4 py-4">
        <div>
          <p className="text-[0.65rem] font-semibold tracking-[0.14em] text-subtle uppercase">
            Listening language
          </p>
          <select
            value={translate.targetLanguage}
            disabled={busy}
            onChange={(event) => {
              translate.setTargetLanguage(
                event.target.value as TargetLanguageCode,
              );
            }}
            className="mt-2 w-full rounded-2xl border border-border/80 bg-background/60 px-4 py-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Listening language"
          >
            {TARGET_LANGUAGE_CATALOG.map((entry) => (
              <option key={entry.code} value={entry.code}>
                {entry.name} · {entry.nativeName}
              </option>
            ))}
          </select>
          <p className="mt-2 text-xs text-muted">
            Default is বাংলা. Current: {language.name}
          </p>
        </div>

        <div>
          <p className="text-[0.65rem] font-semibold tracking-[0.14em] text-subtle uppercase">
            Apply to
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {SCOPES.map((entry) => {
              const summaryBlocked =
                entry.id === "summary" && !summaryDocumentId;
              return (
              <button
                key={entry.id}
                type="button"
                disabled={busy || summaryBlocked}
                title={
                  summaryBlocked
                    ? "Generate a listening mode first"
                    : undefined
                }
                aria-pressed={translate.scope === entry.id}
                onClick={() => {
                  translate.setScope(entry.id);
                }}
                className={cn(
                  "inline-flex h-9 items-center rounded-full border px-3.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  translate.scope === entry.id
                    ? "border-foreground bg-foreground text-background"
                    : "border-border/80 bg-background/50 text-foreground hover:bg-surface-muted",
                  (busy || summaryBlocked) && "cursor-not-allowed opacity-50",
                )}
              >
                {entry.label}
              </button>
              );
            })}
          </div>
          {translate.scope === "summary" && !summaryDocumentId ? (
            <p className="mt-2 text-xs text-muted">
              Generate a listening mode first, then apply language to its text.
            </p>
          ) : null}
        </div>

        {translate.scope === "selection" ? (
          <label className="block">
            <span className="text-[0.65rem] font-semibold tracking-[0.14em] text-subtle uppercase">
              Selected text
            </span>
            <textarea
              value={translate.selectionText}
              disabled={busy}
              onChange={(event) => {
                translate.setSelectionText(event.target.value);
              }}
              rows={4}
              placeholder="Paste selected text from the document…"
              className="mt-2 w-full rounded-2xl border border-border/80 bg-background/60 px-4 py-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>
        ) : null}

        {translate.scope === "summary" ? (
          <label className="block">
            <span className="text-[0.65rem] font-semibold tracking-[0.14em] text-subtle uppercase">
              Listening mode
            </span>
            <select
              value={translate.summaryType}
              disabled={busy}
              onChange={(event) => {
                translate.setSummaryType(
                  event.target.value as "short" | "detailed" | "bullet",
                );
              }}
              className="mt-2 w-full rounded-2xl border border-border/80 bg-background/60 px-4 py-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="short">Quick Listen</option>
              <option value="detailed">Listen to Everything</option>
              <option value="bullet">Key Moments</option>
            </select>
          </label>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              runTranslate(false);
            }}
            className="inline-flex h-10 items-center justify-center rounded-full border border-foreground bg-foreground px-4 text-xs font-semibold text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "Preparing…" : "Apply language"}
          </button>
          {busy ? (
            <button
              type="button"
              onClick={() => {
                translate.stop();
              }}
              className="inline-flex h-10 items-center justify-center rounded-full border border-border/80 px-4 text-xs font-semibold text-foreground hover:bg-surface-muted"
            >
              Stop
            </button>
          ) : null}
          {translate.result ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                runTranslate(true);
              }}
              className="inline-flex h-10 items-center justify-center rounded-full border border-border/80 px-4 text-xs font-semibold text-foreground hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
            >
              Apply again
            </button>
          ) : null}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
        {busy && !translate.streamingText ? (
          <p role="status" className="text-sm text-muted">
            Preparing {language.name}…
          </p>
        ) : null}

        {translate.streamingText &&
        (translate.status === "streaming" ||
          translate.status === "loading" ||
          translate.status === "error") ? (
          <div className="mb-4 space-y-2">
            <article className="rounded-[1.25rem] border border-border/70 bg-background/50 p-4 text-sm leading-relaxed whitespace-pre-wrap text-foreground">
              {translate.streamingText}
              {translate.status === "streaming" ? (
                <span
                  className="ml-0.5 inline-block h-3 w-0.5 animate-pulse bg-accent align-middle"
                  aria-hidden="true"
                />
              ) : null}
            </article>
            {translate.status === "streaming" ? (
              <p className="text-[0.7rem] text-subtle">Streaming language…</p>
            ) : null}
          </div>
        ) : null}

        {translate.status === "error" && translate.error ? (
          <div
            role="alert"
            className="rounded-[1.25rem] border border-danger/30 bg-[color-mix(in_srgb,var(--danger)_8%,transparent)] px-4 py-4"
          >
            <p className="text-sm font-semibold text-danger">
              Language apply failed
            </p>
            <p className="mt-1 text-sm text-muted">{translate.error}</p>
            <button
              type="button"
              onClick={() => {
                runTranslate(false);
              }}
              className="mt-3 inline-flex h-9 items-center rounded-full border border-border px-3.5 text-xs font-semibold text-foreground"
            >
              Try again
            </button>
          </div>
        ) : null}

        {translate.result && translate.status === "success" ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                aria-pressed={translate.viewMode === "translated"}
                onClick={() => {
                  translate.setViewMode("translated");
                }}
                className={cn(
                  "inline-flex h-9 items-center rounded-full border px-3.5 text-xs font-semibold",
                  translate.viewMode === "translated"
                    ? "border-foreground bg-foreground text-background"
                    : "border-border/80 text-foreground",
                )}
              >
                Translated
              </button>
              <button
                type="button"
                aria-pressed={translate.viewMode === "original"}
                onClick={() => {
                  translate.setViewMode("original");
                }}
                className={cn(
                  "inline-flex h-9 items-center rounded-full border px-3.5 text-xs font-semibold",
                  translate.viewMode === "original"
                    ? "border-foreground bg-foreground text-background"
                    : "border-border/80 text-foreground",
                )}
              >
                Original
              </button>
              {translate.result.cached ? (
                <span className="rounded-full border border-success/35 bg-[color-mix(in_srgb,var(--success)_12%,transparent)] px-2.5 py-1 text-[0.65rem] font-semibold text-success">
                  Cached
                </span>
              ) : (
                <span className="rounded-full border border-border/70 px-2.5 py-1 text-[0.65rem] font-semibold text-subtle">
                  Fresh
                </span>
              )}
            </div>

            <article className="rounded-[1.25rem] border border-border/70 bg-background/50 p-4 text-sm leading-relaxed whitespace-pre-wrap text-foreground">
              {displayText}
            </article>

            <p className="text-[0.7rem] text-subtle">
              {language.name}
              {translate.result.pageNumber
                ? ` · page ${translate.result.pageNumber}`
                : ""}
              {translate.result.scope === "summary"
                ? " · listen mode text"
                : translate.result.scope === "document"
                  ? " · whole document"
                  : translate.result.scope === "selection"
                    ? " · selection"
                    : " · this page"}
            </p>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard.writeText(displayText ?? "");
                }}
                className="inline-flex h-9 items-center rounded-full border border-border/80 px-3.5 text-xs font-semibold text-foreground hover:bg-surface-muted"
              >
                Copy
              </button>
              {onListenTranslated &&
              (translate.result.scope === "page" ||
                translate.result.scope === "summary") ? (
                <button
                  type="button"
                  disabled={listenDisabled}
                  onClick={() => {
                    if (translate.result?.scope === "page") {
                      onListenTranslated({
                        scope: "page",
                        storagePath,
                        pageNumber: translate.result.pageNumber ?? pageNumber,
                        targetLanguage: translate.targetLanguage,
                        originalFileName: fileName,
                      });
                      return;
                    }
                    if (
                      translate.result?.scope === "summary" &&
                      translate.result.summaryType
                    ) {
                      onListenTranslated({
                        scope: "summary",
                        documentId:
                          translate.result.documentId ||
                          summaryDocumentId ||
                          undefined,
                        summaryType: translate.result.summaryType,
                        targetLanguage: translate.targetLanguage,
                      });
                    }
                  }}
                  className="inline-flex h-9 items-center rounded-full border border-border/80 px-3.5 text-xs font-semibold text-foreground hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Listen
                </button>
              ) : null}
              {onExportTranslated &&
              (translate.result.scope === "page" ||
                translate.result.scope === "summary") ? (
                <button
                  type="button"
                  disabled={exportDisabled}
                  onClick={() => {
                    if (translate.result?.scope === "page") {
                      onExportTranslated({
                        scope: "page",
                        storagePath,
                        pageNumber: translate.result.pageNumber ?? pageNumber,
                        targetLanguage: translate.targetLanguage,
                        originalFileName: fileName,
                      });
                      return;
                    }
                    if (
                      translate.result?.scope === "summary" &&
                      translate.result.summaryType
                    ) {
                      onExportTranslated({
                        scope: "summary",
                        documentId:
                          translate.result.documentId ||
                          summaryDocumentId ||
                          undefined,
                        summaryType: translate.result.summaryType,
                        targetLanguage: translate.targetLanguage,
                      });
                    }
                  }}
                  className="inline-flex h-9 items-center rounded-full border border-border/80 px-3.5 text-xs font-semibold text-foreground hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Export
                </button>
              ) : null}
            </div>
          </div>
        ) : null}

        {translate.status === "idle" && !translate.result ? (
          <div className="rounded-[1.25rem] border border-dashed border-border/80 bg-surface/40 px-4 py-10 text-center">
            <p className="font-display text-base font-semibold text-foreground">
              No listening language applied
            </p>
            <p className="mx-auto mt-2 max-w-[16rem] text-sm leading-relaxed text-muted">
              Choose a language and what to apply it to, then Apply language.
            </p>
            <p className="mt-3 text-xs text-subtle">
              Default:{" "}
              {getTargetLanguageDefinition(DEFAULT_TARGET_LANGUAGE).name}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
