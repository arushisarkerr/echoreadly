"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Document, Page, pdfjs } from "react-pdf";

import { cn } from "@/utils";

import type { ReaderFitMode } from "./use-reader";

// Bundle the worker from pdfjs-dist so it is served same-origin (CSP worker-src 'self').
// Do not load workers from unpkg or other CDNs.
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

type PdfViewerProps = {
  fileUrl: string;
  pageNumber: number;
  scale: number;
  fitMode: ReaderFitMode;
  onLoadSuccess: (numPages: number) => void;
  onLoadError: (message: string) => void;
  onDocumentLoadingChange: (loading: boolean) => void;
  onPreviousPage: () => void;
  onNextPage: () => void;
};

/**
 * PDF.js page renderer with fit modes and lightweight swipe navigation.
 */
export function PdfViewer({
  fileUrl,
  pageNumber,
  scale,
  fitMode,
  onLoadSuccess,
  onLoadError,
  onDocumentLoadingChange,
  onPreviousPage,
  onNextPage,
}: PdfViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [pageAspect, setPageAspect] = useState(1.294);
  const pointerStartX = useRef<number | null>(null);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        return;
      }

      setContainerSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    });

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const pageWidth =
    fitMode === "width"
      ? Math.max(280, containerSize.width - 32)
      : fitMode === "page"
        ? Math.max(
            240,
            Math.min(
              containerSize.width - 32,
              (containerSize.height - 32) / pageAspect,
            ),
          )
        : undefined;

  const pageScale = fitMode === "custom" ? scale : undefined;

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.pointerType === "mouse") {
        return;
      }
      pointerStartX.current = event.clientX;
    },
    [],
  );

  const handlePointerUp = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (pointerStartX.current === null || event.pointerType === "mouse") {
        return;
      }

      const delta = event.clientX - pointerStartX.current;
      pointerStartX.current = null;

      if (Math.abs(delta) < 56) {
        return;
      }

      if (delta < 0) {
        onNextPage();
      } else {
        onPreviousPage();
      }
    },
    [onNextPage, onPreviousPage],
  );

  return (
    <div
      ref={containerRef}
      role="region"
      aria-label={`PDF page ${pageNumber}`}
      tabIndex={0}
      className={cn(
        "flex min-h-0 flex-1 touch-pan-y justify-center overflow-auto bg-[color-mix(in_srgb,var(--surface-muted)_55%,transparent)] px-3 py-4 sm:px-5 sm:py-6",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
      )}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => {
        pointerStartX.current = null;
      }}
    >
      <Document
        file={fileUrl}
        loading={null}
        onLoadProgress={() => onDocumentLoadingChange(true)}
        onLoadSuccess={(pdf) => {
          onDocumentLoadingChange(false);
          onLoadSuccess(pdf.numPages);
        }}
        onLoadError={(error) => {
          onDocumentLoadingChange(false);
          onLoadError(error.message || "Failed to render this PDF.");
        }}
        className="flex justify-center"
      >
        <Page
          pageNumber={pageNumber}
          width={pageWidth}
          scale={pageScale}
          renderTextLayer={false}
          renderAnnotationLayer={false}
          className="rounded-sm shadow-[var(--elevation-md)]"
          loading={null}
          onRenderSuccess={(page) => {
            const viewport = page.getViewport({ scale: 1 });
            if (viewport.height > 0) {
              setPageAspect(viewport.height / viewport.width);
            }
          }}
          onRenderError={(error) => {
            onLoadError(error.message || "Failed to render this page.");
          }}
        />
      </Document>
    </div>
  );
}
