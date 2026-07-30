/**
 * Client helpers for audio export download.
 */

import { getApiErrorMessage } from "@/utils";

import type { TargetLanguageCode } from "@/constants";
import type { SummaryType } from "@/features/ai";

import type {
  AudioExportDownload,
  AudioExportListItem,
  CreateAudioExportInput,
} from "./types";

export type ExportRequestResult =
  | { ok: true; data: AudioExportDownload }
  | { ok: false; error: string };

export type ExportListResult =
  | { ok: true; data: AudioExportListItem[] }
  | { ok: false; error: string };

/**
 * Request a cached or freshly synthesized MP3 export.
 */
export async function requestAudioExport(
  payload: CreateAudioExportInput,
): Promise<ExportRequestResult> {
  const response = await fetch("/api/documents/export", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const json = (await response.json()) as
    | { ok: true; data: AudioExportDownload }
    | { ok: false; error?: unknown };

  if (!response.ok || !("ok" in json) || !json.ok) {
    return {
      ok: false,
      error: getApiErrorMessage(
        "error" in json ? json.error : undefined,
        "Unable to export audio.",
      ),
    };
  }

  return { ok: true, data: json.data };
}

/**
 * List the signed-in user's cached audio exports.
 */
export async function listAudioExports(): Promise<ExportListResult> {
  const response = await fetch("/api/documents/export", {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  const json = (await response.json()) as
    | { ok: true; data: AudioExportListItem[] }
    | { ok: false; error?: unknown };

  if (!response.ok || !("ok" in json) || !json.ok) {
    return {
      ok: false,
      error: getApiErrorMessage(
        "error" in json ? json.error : undefined,
        "Unable to load exports.",
      ),
    };
  }

  return { ok: true, data: json.data };
}

/**
 * Trigger a browser download from a signed URL with an explicit filename.
 */
export async function downloadAudioFile(
  downloadUrl: string,
  fileName: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const response = await fetch(downloadUrl);
    if (!response.ok) {
      return {
        ok: false,
        error: "Unable to download the export file.",
      };
    }

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = fileName;
    anchor.rel = "noopener";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(objectUrl);
    return { ok: true };
  } catch {
    return {
      ok: false,
      error: "Unable to download the export file.",
    };
  }
}

export type PageExportPayload = {
  storagePath: string;
  pageNumber: number;
  originalFileName?: string;
  regenerate?: boolean;
  targetLanguage?: TargetLanguageCode;
};

export type SummaryExportPayload = {
  documentId: string;
  summaryType: SummaryType;
  regenerate?: boolean;
  targetLanguage?: TargetLanguageCode;
};
