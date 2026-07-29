"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { createPdfSignedUrl, toPdfObjectKey } from "@/lib/storage";

export type ReaderFitMode = "custom" | "width" | "page";

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
  documentError: string | null;
  documentLoading: boolean;
  setNumPages: (count: number) => void;
  setDocumentError: (message: string | null) => void;
  setDocumentLoading: (loading: boolean) => void;
  goToPreviousPage: () => void;
  goToNextPage: () => void;
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

/**
 * Reader state: signed URL loading plus pagination and zoom controls.
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
  const [documentError, setDocumentError] = useState<string | null>(null);
  const [documentLoading, setDocumentLoading] = useState(true);

  const loadSignedUrl = useCallback(async () => {
    setLoadingUrl(true);
    setUrlError(null);
    setSignedUrl(null);
    setDocumentError(null);
    setDocumentLoading(true);
    setPageNumber(1);
    setNumPages(null);

    const result = await createPdfSignedUrl(storagePath);

    setSignedUrl(result.signedUrl);
    setUrlError(result.error);
    setLoadingUrl(false);
  }, [storagePath]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoadingUrl(true);
      setUrlError(null);
      setSignedUrl(null);
      setDocumentError(null);
      setDocumentLoading(true);
      setPageNumber(1);
      setNumPages(null);

      const result = await createPdfSignedUrl(storagePath);
      if (cancelled) {
        return;
      }

      setSignedUrl(result.signedUrl);
      setUrlError(result.error);
      setLoadingUrl(false);
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [storagePath]);

  const goToPreviousPage = useCallback(() => {
    setPageNumber((current) => Math.max(1, current - 1));
  }, []);

  const goToNextPage = useCallback(() => {
    setPageNumber((current) => {
      if (!numPages) {
        return current;
      }
      return Math.min(numPages, current + 1);
    });
  }, [numPages]);

  const zoomIn = useCallback(() => {
    setFitMode("custom");
    setScale((current) => Math.min(MAX_SCALE, Number((current + SCALE_STEP).toFixed(2))));
  }, []);

  const zoomOut = useCallback(() => {
    setFitMode("custom");
    setScale((current) => Math.max(MIN_SCALE, Number((current - SCALE_STEP).toFixed(2))));
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
    documentError,
    documentLoading,
    setNumPages,
    setDocumentError,
    setDocumentLoading,
    goToPreviousPage,
    goToNextPage,
    zoomIn,
    zoomOut,
    fitWidth,
    fitPage,
    setCustomScale,
    retrySignedUrl: loadSignedUrl,
  };
}
