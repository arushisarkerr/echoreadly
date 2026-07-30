"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { getListeningProgressByStoragePath } from "@/features/persistence/progress";
import type {
  DocumentListeningProgressRow,
  ListeningProgressPlaybackSource,
} from "@/features/persistence/types";
import { createClient } from "@/lib/supabase/client";
import { createPdfSignedUrl, toPdfObjectKey } from "@/lib/storage";

export type ReaderFitMode = "custom" | "width" | "page";

export type ReaderPlaybackResume = {
  seconds: number;
  source: ListeningProgressPlaybackSource;
};

export type ReaderState = {
  fileName: string;
  objectKey: string;
  signedUrl: string | null;
  loadingUrl: boolean;
  urlError: string | null;
  pageNumber: number;
  numPages: number | null;
  scale: number;
  fitMode: ReaderFitMode;
  scrollRatio: number;
  setScrollRatio: (ratio: number) => void;
  playbackResume: ReaderPlaybackResume | null;
  clearPlaybackResume: () => void;
  progressHydrated: boolean;
  documentError: string | null;
  documentLoading: boolean;
  setNumPages: (count: number) => void;
  setDocumentError: (message: string | null) => void;
  setDocumentLoading: (loading: boolean) => void;
  goToPreviousPage: () => void;
  goToNextPage: () => void;
  goToPage: (page: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  fitWidth: () => void;
  fitPage: () => void;
  setCustomScale: (scale: number) => void;
  retrySignedUrl: () => Promise<void>;
};

const MIN_SCALE = 0.5;
const MAX_SCALE = 2.5;
const SCALE_STEP = 0.1;

function playbackResumeFromRow(
  row: DocumentListeningProgressRow | null,
): ReaderPlaybackResume | null {
  if (
    !row ||
    !row.playback_source ||
    !Number.isFinite(row.playback_seconds) ||
    row.playback_seconds < 0.25
  ) {
    return null;
  }

  return {
    seconds: row.playback_seconds,
    source: row.playback_source,
  };
}

/**
 * Reader state: signed URL loading, progress restore, pagination, and zoom.
 */
export function useReader(storagePath: string): ReaderState {
  const objectKey = useMemo(() => toPdfObjectKey(storagePath), [storagePath]);
  const fileName = useMemo(() => {
    const segments = objectKey.split("/");
    return segments[segments.length - 1] || "document.pdf";
  }, [objectKey]);

  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loadingUrl, setLoadingUrl] = useState(true);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [scale, setScale] = useState(1);
  const [fitMode, setFitMode] = useState<ReaderFitMode>("width");
  const [scrollRatio, setScrollRatio] = useState(0);
  const [playbackResume, setPlaybackResume] =
    useState<ReaderPlaybackResume | null>(null);
  const [progressHydrated, setProgressHydrated] = useState(false);
  const [documentError, setDocumentError] = useState<string | null>(null);
  const [documentLoading, setDocumentLoading] = useState(true);
  const loadGenerationRef = useRef(0);

  const applyProgressRow = useCallback(
    (row: DocumentListeningProgressRow | null) => {
      if (!row) {
        setPageNumber(1);
        setScrollRatio(0);
        setPlaybackResume(null);
        return;
      }

      setPageNumber(Math.max(1, row.page_number || 1));
      setScrollRatio(
        Number.isFinite(row.scroll_ratio)
          ? Math.min(1, Math.max(0, row.scroll_ratio))
          : 0,
      );
      setPlaybackResume(playbackResumeFromRow(row));
      if (row.page_count && row.page_count >= 1) {
        setNumPages(row.page_count);
      }
    },
    [],
  );

  const loadDocument = useCallback(async () => {
    const generation = ++loadGenerationRef.current;
    setLoadingUrl(true);
    setUrlError(null);
    setSignedUrl(null);
    setDocumentError(null);
    setDocumentLoading(true);
    setProgressHydrated(false);
    setNumPages(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const [urlResult, progressResult] = await Promise.all([
      createPdfSignedUrl(storagePath),
      user
        ? getListeningProgressByStoragePath(storagePath, user.id, supabase)
        : Promise.resolve({
            ok: true as const,
            data: null,
          }),
    ]);

    if (generation !== loadGenerationRef.current) {
      return;
    }

    applyProgressRow(progressResult.ok ? progressResult.data : null);
    setProgressHydrated(true);
    setSignedUrl(urlResult.signedUrl);
    setUrlError(urlResult.error);
    setLoadingUrl(false);
  }, [applyProgressRow, storagePath]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const generation = ++loadGenerationRef.current;

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (cancelled || generation !== loadGenerationRef.current) {
        return;
      }

      setLoadingUrl(true);
      setUrlError(null);
      setSignedUrl(null);
      setDocumentError(null);
      setDocumentLoading(true);
      setProgressHydrated(false);
      setNumPages(null);

      const [urlResult, progressResult] = await Promise.all([
        createPdfSignedUrl(storagePath),
        user
          ? getListeningProgressByStoragePath(storagePath, user.id, supabase)
          : Promise.resolve({
              ok: true as const,
              data: null,
            }),
      ]);

      if (cancelled || generation !== loadGenerationRef.current) {
        return;
      }

      applyProgressRow(progressResult.ok ? progressResult.data : null);
      setProgressHydrated(true);
      setSignedUrl(urlResult.signedUrl);
      setUrlError(urlResult.error);
      setLoadingUrl(false);
    }

    void load();

    return () => {
      cancelled = true;
      loadGenerationRef.current += 1;
    };
  }, [applyProgressRow, storagePath]);

  const clearPlaybackResume = useCallback(() => {
    setPlaybackResume(null);
  }, []);

  const goToPreviousPage = useCallback(() => {
    setPageNumber((current) => Math.max(1, current - 1));
    setScrollRatio(0);
  }, []);

  const goToNextPage = useCallback(() => {
    setPageNumber((current) => {
      if (!numPages) {
        return current;
      }
      return Math.min(numPages, current + 1);
    });
    setScrollRatio(0);
  }, [numPages]);

  const goToPage = useCallback(
    (page: number) => {
      const next = Math.max(1, Math.floor(page) || 1);
      setPageNumber(() => {
        if (!numPages) {
          return next;
        }
        return Math.min(numPages, next);
      });
      setScrollRatio(0);
    },
    [numPages],
  );

  const zoomIn = useCallback(() => {
    setFitMode("custom");
    setScale((current) =>
      Math.min(MAX_SCALE, Number((current + SCALE_STEP).toFixed(2))),
    );
  }, []);

  const zoomOut = useCallback(() => {
    setFitMode("custom");
    setScale((current) =>
      Math.max(MIN_SCALE, Number((current - SCALE_STEP).toFixed(2))),
    );
  }, []);

  const fitWidth = useCallback(() => {
    setFitMode("width");
  }, []);

  const fitPage = useCallback(() => {
    setFitMode("page");
  }, []);

  const setCustomScale = useCallback((nextScale: number) => {
    setFitMode("custom");
    setScale(Math.min(MAX_SCALE, Math.max(MIN_SCALE, nextScale)));
  }, []);

  return {
    fileName,
    objectKey,
    signedUrl,
    loadingUrl,
    urlError,
    pageNumber,
    numPages,
    scale,
    fitMode,
    scrollRatio,
    setScrollRatio,
    playbackResume,
    clearPlaybackResume,
    progressHydrated,
    documentError,
    documentLoading,
    setNumPages,
    setDocumentError,
    setDocumentLoading,
    goToPreviousPage,
    goToNextPage,
    goToPage,
    zoomIn,
    zoomOut,
    fitWidth,
    fitPage,
    setCustomScale,
    retrySignedUrl: loadDocument,
  };
}
