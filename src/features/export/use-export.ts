"use client";

import { useRef, useState } from "react";

import {
  downloadAudioFile,
  requestAudioExport,
  type PageExportPayload,
  type SummaryExportPayload,
} from "./export-client";
import type { CreateAudioExportInput, ExportUiStatus } from "./types";

export type UseAudioExportState = {
  status: ExportUiStatus;
  error: string | null;
  lastFileName: string | null;
  isExporting: boolean;
  exportPage: (input: PageExportPayload) => Promise<void>;
  exportSummary: (input: SummaryExportPayload) => Promise<void>;
  reset: () => void;
};

/**
 * Client export hook — blocks duplicate in-flight requests.
 */
export function useAudioExport(): UseAudioExportState {
  const [status, setStatus] = useState<ExportUiStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [lastFileName, setLastFileName] = useState<string | null>(null);
  const inFlightRef = useRef(false);

  async function runExport(payload: CreateAudioExportInput) {
    if (inFlightRef.current) {
      return;
    }

    inFlightRef.current = true;
    setStatus("exporting");
    setError(null);

    try {
      const result = await requestAudioExport(payload);
      if (!result.ok) {
        setStatus("error");
        setError(result.error);
        return;
      }

      const downloaded = await downloadAudioFile(
        result.data.downloadUrl,
        result.data.fileName,
      );

      if (!downloaded.ok) {
        setStatus("error");
        setError(downloaded.error);
        return;
      }

      setLastFileName(result.data.fileName);
      setStatus("success");
    } catch {
      setStatus("error");
      setError("Unable to export audio.");
    } finally {
      inFlightRef.current = false;
    }
  }

  return {
    status,
    error,
    lastFileName,
    isExporting: status === "exporting",
    exportPage: async (input) => {
      await runExport({
        source: "page",
        storagePath: input.storagePath,
        pageNumber: input.pageNumber,
        originalFileName: input.originalFileName,
        regenerate: input.regenerate,
      });
    },
    exportSummary: async (input) => {
      await runExport({
        source: "summary",
        documentId: input.documentId,
        summaryType: input.summaryType,
        regenerate: input.regenerate,
      });
    },
    reset: () => {
      if (inFlightRef.current) {
        return;
      }
      setStatus("idle");
      setError(null);
      setLastFileName(null);
    },
  };
}
