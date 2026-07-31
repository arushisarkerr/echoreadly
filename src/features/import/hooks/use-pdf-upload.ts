"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";

import type { SelectedPdf } from "@/features/import/types";
import {
  clearPdfUploadState,
  getImportOwnerId,
  getPdfUploadState,
  revalidatePersistedPdfUpload,
  setPdfUploadState,
  subscribePdfUploadStore,
} from "@/features/import/utils/pdf-upload-store";
import {
  removeUploadedPdf,
  uploadPdfToSupabase,
} from "@/features/import/utils/upload-pdf-client";
import { validatePdfFile } from "@/features/import/utils/validate-pdf";

export type UsePdfUploadReturn = {
  status: ReturnType<typeof getPdfUploadState>["status"];
  selected: SelectedPdf | null;
  progress: number;
  error: string | null;
  result: ReturnType<typeof getPdfUploadState>["result"];
  selectFile: (file: File | null | undefined) => void;
  upload: () => Promise<void>;
  remove: () => Promise<void>;
  reset: () => void;
  canUpload: boolean;
};

function toSelected(file: File): SelectedPdf {
  return {
    file,
    name: file.name,
    size: file.size,
    type: file.type || "application/pdf",
  };
}

function createIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `00000000-0000-4000-8000-${Date.now().toString(16).padStart(12, "0").slice(-12)}`;
}

const serverSnapshot = {
  status: "idle" as const,
  selected: null,
  selectedMeta: null,
  progress: 0,
  error: null,
  result: null,
};

/**
 * Module-scoped lock + key survive component remounts (e.g. Strict Mode).
 * Component refs alone reset on remount and can allow a second in-flight upload.
 */
let uploadInFlight = false;
let activeIdempotencyKey: string | null = null;

function clearUploadAttempt(options?: { keepIdempotencyKey?: boolean }) {
  uploadInFlight = false;
  if (!options?.keepIdempotencyKey) {
    activeIdempotencyKey = null;
  }
}

/**
 * Reusable PDF upload state machine for the Import feature.
 * Successful uploads rehydrate from localStorage + Supabase after hard refresh.
 */
export function usePdfUpload(): UsePdfUploadReturn {
  const state = useSyncExternalStore(
    subscribePdfUploadStore,
    getPdfUploadState,
    () => serverSnapshot,
  );
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    void revalidatePersistedPdfUpload();
  }, []);

  function selectFile(file: File | null | undefined) {
    abortRef.current?.abort();
    abortRef.current = null;
    clearUploadAttempt();

    const validation = validatePdfFile(file);
    if (!validation.ok) {
      setPdfUploadState({
        selected: null,
        selectedMeta: null,
        progress: 0,
        result: null,
        status: "failed",
        error: validation.message,
      });
      return;
    }

    const selected = toSelected(validation.file);
    setPdfUploadState({
      selected,
      selectedMeta: {
        name: selected.name,
        size: selected.size,
        type: selected.type,
      },
      progress: 0,
      result: null,
      error: null,
      status: "idle",
    });
  }

  async function upload() {
    // Synchronous lock prevents double-submit races before React state updates.
    if (uploadInFlight) {
      return;
    }

    const current = getPdfUploadState();
    if (
      !current.selected ||
      current.status === "uploading" ||
      current.status === "success"
    ) {
      return;
    }

    if (current.selected.file.size <= 0) {
      setPdfUploadState({
        status: "failed",
        error: "Please choose the PDF again to upload.",
        progress: 0,
        result: null,
      });
      return;
    }

    uploadInFlight = true;
    const idempotencyKey = activeIdempotencyKey ?? createIdempotencyKey();
    activeIdempotencyKey = idempotencyKey;

    const controller = new AbortController();
    abortRef.current = controller;

    setPdfUploadState({
      status: "uploading",
      progress: 0,
      error: null,
      result: null,
    });

    try {
      const next = await uploadPdfToSupabase(current.selected.file, {
        ownerId: getImportOwnerId(),
        idempotencyKey,
        signal: controller.signal,
        onProgress: (event) => {
          setPdfUploadState({
            status: "uploading",
            progress: event.percent,
            error: null,
            result: null,
          });
        },
      });

      if (controller.signal.aborted) {
        return;
      }

      setPdfUploadState({
        result: next,
        selectedMeta: {
          name: next.name,
          size: next.size,
          type: current.selected.type || "application/pdf",
        },
        selected: {
          ...current.selected,
          name: next.name,
          size: next.size,
        },
        progress: 100,
        status: "success",
        error: null,
      });
      clearUploadAttempt();
    } catch (cause) {
      if (controller.signal.aborted) {
        return;
      }

      const message =
        cause instanceof Error && cause.message
          ? cause.message
          : "Upload failed. Please try again.";

      setPdfUploadState({
        progress: 0,
        result: null,
        status: "failed",
        error: message,
      });
      // Keep the same idempotency key for retry of this failed attempt.
      clearUploadAttempt({ keepIdempotencyKey: true });
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
      }
      uploadInFlight = false;
    }
  }

  async function remove() {
    abortRef.current?.abort();
    abortRef.current = null;
    clearUploadAttempt();

    const uploaded = getPdfUploadState().result;
    clearPdfUploadState();

    // Explicit delete only — removes the current document from storage + library.
    if (uploaded) {
      try {
        await removeUploadedPdf(uploaded);
      } catch {
        // Local UI state is already cleared; remote cleanup is best-effort.
      }
    }
  }

  function reset() {
    // Clear the Import session only. Previous uploads remain in the Library.
    abortRef.current?.abort();
    abortRef.current = null;
    clearUploadAttempt();
    clearPdfUploadState();
  }

  return {
    status: state.status,
    selected: state.selected,
    progress: state.progress,
    error: state.error,
    result: state.result,
    selectFile,
    upload,
    remove,
    reset,
    canUpload:
      Boolean(state.selected) &&
      state.status !== "uploading" &&
      state.status !== "success",
  };
}
