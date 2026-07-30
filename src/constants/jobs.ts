/**
 * Background job catalog — types, statuses, retry policy.
 */

export const JOB_STATUSES = [
  "pending",
  "running",
  "completed",
  "failed",
  "retrying",
  "cancelled",
] as const;

export type JobStatus = (typeof JOB_STATUSES)[number];

export const JOB_TYPES = [
  "document_process",
  "ocr",
  "summary_generate",
  "translation",
  "tts_generate",
  "audio_export",
  "embedding_generate",
  "analytics_aggregate",
  "cache_refresh",
  "cleanup",
] as const;

export type JobType = (typeof JOB_TYPES)[number];

export function isJobType(value: unknown): value is JobType {
  return (
    typeof value === "string" &&
    (JOB_TYPES as readonly string[]).includes(value)
  );
}

export function isJobStatus(value: unknown): value is JobStatus {
  return (
    typeof value === "string" &&
    (JOB_STATUSES as readonly string[]).includes(value)
  );
}

/** Default max attempts before a job is marked failed (dead). */
export const DEFAULT_JOB_MAX_ATTEMPTS = 3;

/** Worker claim batch size (concurrency control). */
export const JOB_CLAIM_BATCH_SIZE = 2;

/** Stale running lock recovery window (seconds). */
export const JOB_STALE_LOCK_SECONDS = 900;

/** Job runner timeout soft limit (ms) — handlers should finish sooner. */
export const JOB_HANDLER_TIMEOUT_MS = 120_000;

/** Exponential backoff: min(cap, base * 2^attempt) seconds. */
export function jobBackoffSeconds(attempt: number): number {
  const base = 5;
  const capped = Math.min(3600, base * 2 ** Math.max(1, attempt));
  return capped;
}

export function jobTypeLabel(type: JobType): string {
  switch (type) {
    case "document_process":
      return "Document processing";
    case "ocr":
      return "OCR extraction";
    case "summary_generate":
      return "AI summary";
    case "translation":
      return "Translation";
    case "tts_generate":
      return "TTS generation";
    case "audio_export":
      return "Audio export";
    case "embedding_generate":
      return "Embedding generation";
    case "analytics_aggregate":
      return "Analytics aggregation";
    case "cache_refresh":
      return "Cache refresh";
    case "cleanup":
      return "Cleanup";
  }
}
