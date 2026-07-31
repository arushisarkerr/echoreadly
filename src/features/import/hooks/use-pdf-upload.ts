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

const serverSnapshot = {
  status: "idle" as const,
  selected: null,
  selectedMeta: null,
  progress: 0,
  error: null,
  result: null,
};

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
    const current = getPdfUploadState();
    if (!current.selected || current.status === "uploading") {
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

    abortRef.current?.abort();
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
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
      }
    }
  }

  async function remove() {
    abortRef.current?.abort();
    abortRef.current = null;

    const uploaded = getPdfUploadState().result;
    clearPdfUploadState();

    if (uploaded) {
      try {
        await removeUploadedPdf(uploaded);
      } catch {
        // Local UI state is already cleared; remote cleanup is best-effort.
      }
    }
  }

  function reset() {
    void remove();
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
