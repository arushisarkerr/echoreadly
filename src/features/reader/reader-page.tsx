"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

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

/**
 * Full reader experience for a PDF selected from the library.
 */
export function ReaderPage({ storagePath }: ReaderPageProps) {
  const reader = useReader(storagePath);
  const tts = useTts();
  const [summaryOpen, setSummaryOpen] = useState(false);
  const ttsBusy = tts.status === "loading";

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
      void tts.listenPage({
        storagePath,
        pageNumber: reader.pageNumber,
        originalFileName: reader.fileName,
      });
    },
    listenPageDisabled: ttsBusy || reader.documentLoading,
    onPreviousPage: reader.goToPreviousPage,
    onNextPage: reader.goToNextPage,
    onZoomIn: reader.zoomIn,
    onZoomOut: reader.zoomOut,
    onFitWidth: reader.fitWidth,
    onFitPage: reader.fitPage,
  };

  if (reader.loadingUrl) {
    return (
      <div className="flex min-h-[calc(100svh-4rem)] flex-col">
        <ReaderToolbar {...toolbarProps} pageNumber={1} numPages={null} disabled />
        <ReaderLoading message="Fetching secure PDF link…" />
      </div>
    );
  }

  if (reader.urlError || !reader.signedUrl) {
    return (
      <div className="flex min-h-[calc(100svh-4rem)] flex-col">
        <ReaderToolbar {...toolbarProps} disabled />
        <ReaderError
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
      <div className="flex min-h-[calc(100svh-4rem)] flex-col">
        <ReaderToolbar {...toolbarProps} disabled />
        <ReaderError
          message={reader.documentError}
          onRetry={() => {
            void reader.retrySignedUrl();
          }}
        />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-[calc(100svh-4rem)] flex-col">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_color-mix(in_srgb,var(--accent)_10%,transparent),_transparent_42%),linear-gradient(180deg,var(--background),color-mix(in_srgb,var(--surface-muted)_28%,var(--background)))]"
      />
      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
        <ReaderToolbar {...toolbarProps} disabled={reader.documentLoading} />

        <div className="flex min-h-0 flex-1">
          <div className="relative flex min-h-0 flex-1 flex-col">
            {reader.documentLoading ? (
              <div className="absolute inset-0 z-10 bg-background/60 backdrop-blur-[1px]">
                <ReaderLoading message="Rendering PDF…" />
              </div>
            ) : null}

            <PdfViewer
              fileUrl={reader.signedUrl}
              pageNumber={reader.pageNumber}
              scale={reader.scale}
              fitMode={reader.fitMode}
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
            onListenSummary={(text) => {
              void tts.listenSummary(text);
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
