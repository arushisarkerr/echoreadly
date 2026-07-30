/**
 * Server-side orchestration for summarizing a PDF by storage path.
 * Reuses persisted processing and summaries when available.
 */

import type { SummaryResult, SummaryType } from "@/features/ai";
import {
  ensureDocumentProcessed,
  summarizeDocument,
  type ProcessingResult,
} from "@/features/processing";

export type SummarizeByStoragePathInput = {
  storagePath: string;
  summaryType: SummaryType;
  originalFileName?: string;
  fileSize?: number;
  regenerate?: boolean;
};

function getFileNameFromStoragePath(storagePath: string): string {
  const segments = storagePath.split("/");
  return segments[segments.length - 1] || "document.pdf";
}

/**
 * End-to-end summary generation for a library PDF identified by storage path.
 * Processes once per document hash and persists results in Supabase.
 */
export async function summarizeDocumentByStoragePath(
  input: SummarizeByStoragePathInput,
): Promise<ProcessingResult<SummaryResult>> {
  if (!input.storagePath.trim()) {
    return { ok: false, error: "storagePath is required." };
  }

  const processed = await ensureDocumentProcessed({
    storagePath: input.storagePath,
    originalFileName:
      input.originalFileName ?? getFileNameFromStoragePath(input.storagePath),
    fileSize: input.fileSize,
  });

  if (!processed.ok) {
    return processed;
  }

  return summarizeDocument(processed.data.document.id, input.summaryType, {
    regenerate: input.regenerate,
  });
}
