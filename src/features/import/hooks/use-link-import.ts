"use client";

import { useRef, useState } from "react";

import { getImportOwnerId } from "@/features/import/utils/pdf-upload-store";
import { uploadLinkToSupabase } from "@/features/import/utils/upload-link-client";
import type { PdfUploadResult, PdfUploadStatus } from "@/features/import/types";

export type UseLinkImportReturn = {
  status: PdfUploadStatus;
  url: string;
  progress: number;
  error: string | null;
  result: PdfUploadResult | null;
  setUrl: (value: string) => void;
  submit: () => Promise<void>;
  reset: () => void;
  canSubmit: boolean;
};

function createIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `00000000-0000-4000-8000-${Date.now().toString(16).padStart(12, "0").slice(-12)}`;
}

let linkImportInFlight = false;
let activeLinkIdempotencyKey: string | null = null;

/**
 * Link import state machine — mirrors the PDF upload flow (progress → success/error).
 */
export function useLinkImport(): UseLinkImportReturn {
  const [status, setStatus] = useState<PdfUploadStatus>("idle");
  const [url, setUrlState] = useState("");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PdfUploadResult | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  function setUrl(value: string) {
    setUrlState(value);
    if (status === "failed" || status === "success") {
      setStatus("idle");
      setError(null);
      setResult(null);
      setProgress(0);
      activeLinkIdempotencyKey = null;
    }
  }

  async function submit() {
    if (linkImportInFlight || status === "uploading" || status === "success") {
      return;
    }

    const trimmed = url.trim();
    if (!trimmed) {
      setStatus("failed");
      setError("Enter a URL to import.");
      return;
    }

    linkImportInFlight = true;
    const idempotencyKey = activeLinkIdempotencyKey ?? createIdempotencyKey();
    activeLinkIdempotencyKey = idempotencyKey;
    const controller = new AbortController();
    abortRef.current = controller;

    setStatus("uploading");
    setProgress(0);
    setError(null);
    setResult(null);

    try {
      const next = await uploadLinkToSupabase(trimmed, {
        ownerId: getImportOwnerId(),
        idempotencyKey,
        signal: controller.signal,
        onProgress: (event) => {
          setProgress(event.percent);
        },
      });

      if (controller.signal.aborted) {
        return;
      }

      setResult(next);
      setProgress(100);
      setStatus("success");
      setError(null);
      activeLinkIdempotencyKey = null;
    } catch (cause) {
      if (controller.signal.aborted) {
        return;
      }
      setProgress(0);
      setResult(null);
      setStatus("failed");
      setError(
        cause instanceof Error && cause.message
          ? cause.message
          : "Unable to import link.",
      );
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
      }
      linkImportInFlight = false;
    }
  }

  function reset() {
    abortRef.current?.abort();
    abortRef.current = null;
    linkImportInFlight = false;
    activeLinkIdempotencyKey = null;
    setStatus("idle");
    setUrlState("");
    setProgress(0);
    setError(null);
    setResult(null);
  }

  return {
    status,
    url,
    progress,
    error,
    result,
    setUrl,
    submit,
    reset,
    canSubmit:
      Boolean(url.trim()) && status !== "uploading" && status !== "success",
  };
}
