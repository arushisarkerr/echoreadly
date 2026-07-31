import type {
  PdfUploadProgressEvent,
  PdfUploadResult,
} from "@/features/import/types";

type UploadLinkClientOptions = {
  ownerId: string;
  idempotencyKey: string;
  onProgress?: (event: PdfUploadProgressEvent) => void;
  signal?: AbortSignal;
};

type UploadApiSuccess = {
  ok: true;
  result: PdfUploadResult;
};

type UploadApiFailure = {
  ok: false;
  error?: string;
};

/**
 * Import a Website / YouTube URL through the shared link ingest API.
 */
export async function uploadLinkToSupabase(
  url: string,
  options: UploadLinkClientOptions,
): Promise<PdfUploadResult> {
  const { ownerId, idempotencyKey, onProgress, signal } = options;

  onProgress?.({ loaded: 0, total: 100, percent: 10 });

  const response = await fetch("/api/import/link", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ url, ownerId, idempotencyKey }),
    signal,
  });

  onProgress?.({ loaded: 70, total: 100, percent: 70 });

  let payload: UploadApiSuccess | UploadApiFailure | null = null;
  try {
    payload = (await response.json()) as UploadApiSuccess | UploadApiFailure;
  } catch {
    payload = null;
  }

  if (response.ok && payload?.ok) {
    onProgress?.({ loaded: 100, total: 100, percent: 100 });
    return payload.result;
  }

  const message =
    payload && !payload.ok && payload.error
      ? payload.error
      : "Unable to import link.";
  throw new Error(message);
}
