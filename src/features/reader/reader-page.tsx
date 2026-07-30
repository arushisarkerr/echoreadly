"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

import { useProgressPersistence } from "@/features/progress";
import { useAudioExport } from "@/features/export";
import { SummaryPanel } from "@/features/summary";
import { AudioPlayer, useTts } from "@/features/tts";

import { ReaderError } from "./error";
import { ReaderLoading } from "./loading";
import { ReaderToolbar } from "./reader-toolbar";
import { useReader } from "./use-reader";

const PdfViewer = dynamic(
  () => import("./pdf-viewer").then((module) => module.PdfViewer),
  {
    ssr: false,
    loading: () => <ReaderLoading message="Preparing viewer…" />,
  },
);

type ReaderPageProps = {
  storagePath: string;
};

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  return Boolean(
    target.closest("input, textarea, select, [contenteditable='true']"),
  );
}

/**
 * Full reader experience for a PDF selected from the library.
 */
export function ReaderPage({ storagePath }: ReaderPageProps) {
  const reader = useReader(storagePath);
  const tts = useTts();
  const pageExport = useAudioExport();
  const summaryExport = useAudioExport();
  const [summaryOpen, setSummaryOpen] = useState(false);
  const ttsBusy = tts.status === "loading";
  const controlsLocked = reader.documentLoading || reader.loadingUrl;

  const playbackActive =
    tts.status === "playing" ||
    tts.status === "paused" ||
    tts.status === "ready" ||
    tts.status === "loading";

  const pendingPlayback = reader.playbackResume;
  const restoredPageRef = useRef<number | null>(null);

  useProgressPersistence({
    storagePath,
    pageNumber: reader.pageNumber,
    pageCount: reader.numPages,
    scrollRatio: reader.scrollRatio,
    playbackSeconds: playbackActive
      ? tts.currentTime
      : (pendingPlayback?.seconds ?? 0),
    playbackSource: playbackActive
      ? tts.source
      : (pendingPlayback?.source ?? null),
    enabled: reader.progressHydrated && !reader.loadingUrl && !reader.urlError,
  });

  const {
    goToPreviousPage,
    goToNextPage,
    zoomIn,
    zoomOut,
    documentError,
    urlError,
    clearPlaybackResume,
    playbackResume,
    progressHydrated,
    pageNumber,
  } = reader;

  useEffect(() => {
    restoredPageRef.current = null;
  }, [storagePath]);

  useEffect(() => {
    if (!progressHydrated) {
      return;
    }
    if (restoredPageRef.current === null) {
      restoredPageRef.current = pageNumber;
      return;
    }
    if (
      pageNumber !== restoredPageRef.current &&
      playbackResume?.source === "page"
    ) {
      clearPlaybackResume();
    }
    restoredPageRef.current = pageNumber;
  }, [progressHydrated, pageNumber, playbackResume?.source, clearPlaybackResume]);

  const toolbarProps = {
    fileName: reader.fileName,
    pageNumber: reader.pageNumber,
    numPages: reader.numPages,
    scale: reader.scale,
    fitMode: reader.fitMode,
    summaryOpen,
    onToggleSummary: () => {
      setSummaryOpen((current) => !current);
    },
    onListenPage: () => {
      const seekTo =
        playbackResume?.source === "page"
          ? playbackResume.seconds
          : undefined;
      if (seekTo != null) {
        clearPlaybackResume();
      }
      void tts.listenPage({
        storagePath,
        pageNumber: reader.pageNumber,
        originalFileName: reader.fileName,
        seekTo,
      });
    },
    listenPageDisabled: ttsBusy || reader.documentLoading,
    onExportPage: () => {
      void pageExport.exportPage({
        storagePath,
        pageNumber: reader.pageNumber,
        originalFileName: reader.fileName,
      });
    },
    exportPageDisabled:
      pageExport.isExporting ||
      reader.documentLoading ||
      summaryExport.isExporting,
    exportPageStatus: pageExport.status,
    exportPageError: pageExport.error,
    exportPageFileName: pageExport.lastFileName,
    onPreviousPage: reader.goToPreviousPage,
    onNextPage: reader.goToNextPage,
    onZoomIn: reader.zoomIn,
    onZoomOut: reader.zoomOut,
    onFitWidth: reader.fitWidth,
    onFitPage: reader.fitPage,
  };

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (isTypingTarget(event.target)) {
        return;
      }
      if (controlsLocked || documentError || urlError) {
        return;
      }

      switch (event.key) {
        case "ArrowLeft":
        case "PageUp":
          event.preventDefault();
          goToPreviousPage();
          break;
        case "ArrowRight":
        case "PageDown":
          event.preventDefault();
          goToNextPage();
          break;
        case "+":
        case "=":
          event.preventDefault();
          zoomIn();
          break;
        case "-":
        case "_":
          event.preventDefault();
          zoomOut();
          break;
        default:
          break;
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    controlsLocked,
    documentError,
    urlError,
    goToPreviousPage,
    goToNextPage,
    zoomIn,
    zoomOut,
  ]);

  if (reader.loadingUrl || !reader.progressHydrated) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <ReaderToolbar {...toolbarProps} pageNumber={1} numPages={null} disabled />
        <ReaderLoading message="Fetching secure PDF link…" />
      </div>
    );
  }

  if (reader.urlError || !reader.signedUrl) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <ReaderToolbar {...toolbarProps} disabled />
        <ReaderError
          title="Couldn’t open this document"
          message={reader.urlError || "Signed URL was not available."}
          onRetry={() => {
            void reader.retrySignedUrl();
          }}
        />
      </div>
    );
  }

  if (reader.documentError) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <ReaderToolbar {...toolbarProps} disabled />
        <ReaderError
          title="Couldn’t render this PDF"
          message={reader.documentError}
          onRetry={() => {
            void reader.retrySignedUrl();
          }}
        />
      </div>
    );
  }

  return (
    <div className="relative flex h-full min-h-0 flex-col">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_color-mix(in_srgb,var(--accent)_10%,transparent),_transparent_42%),linear-gradient(180deg,var(--background),color-mix(in_srgb,var(--surface-muted)_28%,var(--background)))]"
      />
      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
        <ReaderToolbar {...toolbarProps} disabled={reader.documentLoading} />

        <div className="flex min-h-0 flex-1">
          <div className="relative flex min-h-0 flex-1 flex-col">
            {reader.documentLoading ? (
              <div className="absolute inset-0 z-10 bg-background/65 backdrop-blur-[1px]">
                <ReaderLoading message="Rendering PDF…" />
              </div>
            ) : null}

            <PdfViewer
              fileUrl={reader.signedUrl}
              pageNumber={reader.pageNumber}
              scale={reader.scale}
              fitMode={reader.fitMode}
              scrollRatio={reader.scrollRatio}
              onScrollRatioChange={reader.setScrollRatio}
              onLoadSuccess={reader.setNumPages}
              onLoadError={reader.setDocumentError}
              onDocumentLoadingChange={reader.setDocumentLoading}
              onPreviousPage={reader.goToPreviousPage}
              onNextPage={reader.goToNextPage}
            />
          </div>

          <SummaryPanel
            storagePath={storagePath}
            fileName={reader.fileName}
            open={summaryOpen}
            onClose={() => {
              setSummaryOpen(false);
            }}
            listenDisabled={ttsBusy}
            onListenSummary={(input) => {
              const seekTo =
                playbackResume?.source === "summary"
                  ? playbackResume.seconds
                  : undefined;
              if (seekTo != null) {
                clearPlaybackResume();
              }
              void tts.listenSummary(input, { seekTo });
            }}
            exportDisabled={
              summaryExport.isExporting || pageExport.isExporting
            }
            exportStatus={summaryExport.status}
            exportError={summaryExport.error}
            exportFileName={summaryExport.lastFileName}
            onExportSummary={(input) => {
              void summaryExport.exportSummary(input);
            }}
          />
        </div>

        <AudioPlayer
          status={tts.status}
          source={tts.source}
          error={tts.error}
          currentTime={tts.currentTime}
          duration={tts.duration}
          speed={tts.speed}
          speeds={tts.speeds}
          onPlay={tts.play}
          onPause={tts.pause}
          onResume={tts.resume}
          onStop={tts.stop}
          onSpeedChange={tts.setSpeed}
          onSeek={tts.seek}
        />
      </div>
    </div>
  );
}
