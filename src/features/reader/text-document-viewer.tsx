"use client";

import { useEffect, useRef, useState } from "react";

import {
  formatFromExtension,
  type DocumentFormat,
} from "@/constants";
import { splitTextIntoVirtualPages } from "@/features/processing/split-virtual-pages";
import { cn } from "@/utils";

type TextDocumentViewerProps = {
  fileUrl: string;
  fileName: string;
  pageNumber: number;
  scrollRatio: number;
  onScrollRatioChange: (ratio: number) => void;
  onLoadSuccess: (numPages: number) => void;
  onLoadError: (message: string) => void;
  onDocumentLoadingChange: (loading: boolean) => void;
};

async function extractPagesFromUrl(
  fileUrl: string,
  format: DocumentFormat,
): Promise<string[]> {
  const response = await fetch(fileUrl);
  if (!response.ok) {
    throw new Error("Unable to load document for reading.");
  }

  if (format === "docx") {
    const buffer = await response.arrayBuffer();
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({
      arrayBuffer: buffer,
    });
    const text = (result.value ?? "").trim();
    if (!text) {
      throw new Error("This DOCX file has no readable text.");
    }
    return splitTextIntoVirtualPages(text);
  }

  const text = (await response.text()).replace(/^\uFEFF/, "").trim();
  if (!text) {
    throw new Error(
      format === "markdown"
        ? "This Markdown file has no readable text."
        : "This text file has no readable content.",
    );
  }
  return splitTextIntoVirtualPages(text);
}

/**
 * Paginated text viewer for DOCX / TXT / Markdown imports.
 * Uses the same virtual-page model as TTS and summaries.
 */
export function TextDocumentViewer({
  fileUrl,
  fileName,
  pageNumber,
  scrollRatio,
  onScrollRatioChange,
  onLoadSuccess,
  onLoadError,
  onDocumentLoadingChange,
}: TextDocumentViewerProps) {
  const [pages, setPages] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const format = formatFromExtension(fileName) ?? "txt";

  useEffect(() => {
    let cancelled = false;
    onDocumentLoadingChange(true);

    void (async () => {
      try {
        const nextPages = await extractPagesFromUrl(fileUrl, format);
        if (cancelled) {
          return;
        }
        setPages(nextPages);
        onLoadSuccess(Math.max(1, nextPages.length));
        onDocumentLoadingChange(false);
      } catch (error) {
        if (cancelled) {
          return;
        }
        onLoadError(
          error instanceof Error
            ? error.message
            : "Unable to open this document.",
        );
        onDocumentLoadingChange(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    fileUrl,
    format,
    onDocumentLoadingChange,
    onLoadError,
    onLoadSuccess,
  ]);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node || pages.length === 0) {
      return;
    }
    const max = Math.max(0, node.scrollHeight - node.clientHeight);
    node.scrollTop = max * Math.min(1, Math.max(0, scrollRatio));
  }, [pageNumber, pages.length, scrollRatio]);

  const pageText = pages[pageNumber - 1] ?? "";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-6 sm:px-8"
        onScroll={(event) => {
          const node = event.currentTarget;
          const max = Math.max(0, node.scrollHeight - node.clientHeight);
          onScrollRatioChange(max > 0 ? node.scrollTop / max : 0);
        }}
      >
        <article
          aria-label={`${fileName} page ${pageNumber}`}
          className={cn(
            "mx-auto w-full rounded-[1.5rem] border border-border/70 bg-background/70 p-5 sm:p-8",
          )}
          style={{
            maxWidth: "var(--reader-content-max)",
            fontSize: "calc(1rem * var(--reader-font-scale))",
          }}
        >
          <p className="mb-4 text-[0.65rem] font-semibold tracking-[0.16em] text-subtle uppercase">
            {format === "markdown"
              ? "Markdown"
              : format === "docx"
                ? "DOCX"
                : "Text"}{" "}
            · Page {pageNumber}
            {pages.length > 0 ? ` of ${pages.length}` : ""}
          </p>
          <div className="whitespace-pre-wrap text-[0.975rem] leading-[1.75] text-foreground">
            {pageText || "No text on this page."}
          </div>
        </article>
      </div>
    </div>
  );
}
