/**
 * Client helpers for background jobs.
 */

import { getApiErrorMessage } from "@/utils";
import type { JobType } from "@/constants/jobs";

import type { BackgroundJobView } from "./types";

export async function fetchJobs(input?: {
  status?: string;
  limit?: number;
}): Promise<
  { ok: true; jobs: BackgroundJobView[] } | { ok: false; error: string }
> {
  const params = new URLSearchParams();
  if (input?.status) params.set("status", input.status);
  if (input?.limit) params.set("limit", String(input.limit));

  const response = await fetch(
    `/api/jobs${params.size ? `?${params.toString()}` : ""}`,
    { method: "GET", headers: { Accept: "application/json" } },
  );

  const json = (await response.json()) as
    | { ok: true; data: { jobs: BackgroundJobView[] } }
    | { ok: false; error?: unknown };

  if (!response.ok || !("ok" in json) || !json.ok) {
    return {
      ok: false,
      error: getApiErrorMessage(
        "error" in json ? json.error : undefined,
        "Unable to load jobs.",
      ),
    };
  }

  return { ok: true, jobs: json.data.jobs };
}

export async function fetchJob(
  jobId: string,
): Promise<
  { ok: true; job: BackgroundJobView } | { ok: false; error: string }
> {
  const response = await fetch(`/api/jobs/${encodeURIComponent(jobId)}`, {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  const json = (await response.json()) as
    | { ok: true; data: { job: BackgroundJobView } }
    | { ok: false; error?: unknown };

  if (!response.ok || !("ok" in json) || !json.ok) {
    return {
      ok: false,
      error: getApiErrorMessage(
        "error" in json ? json.error : undefined,
        "Unable to load job.",
      ),
    };
  }

  return { ok: true, job: json.data.job };
}

export async function enqueueJobClient(input: {
  jobType: JobType;
  payload?: Record<string, unknown>;
  documentId?: string;
  storagePath?: string;
  idempotencyKey?: string;
}): Promise<
  | { ok: true; job: BackgroundJobView; created: boolean }
  | { ok: false; error: string }
> {
  const response = await fetch("/api/jobs", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  const json = (await response.json()) as
    | { ok: true; data: { job: BackgroundJobView; created: boolean } }
    | { ok: false; error?: unknown };

  if (!response.ok || !("ok" in json) || !json.ok) {
    return {
      ok: false,
      error: getApiErrorMessage(
        "error" in json ? json.error : undefined,
        "Unable to enqueue job.",
      ),
    };
  }

  return {
    ok: true,
    job: json.data.job,
    created: json.data.created,
  };
}

export async function cancelJobClient(
  jobId: string,
): Promise<
  { ok: true; job: BackgroundJobView } | { ok: false; error: string }
> {
  const response = await fetch(
    `/api/jobs/${encodeURIComponent(jobId)}/cancel`,
    {
      method: "POST",
      headers: { Accept: "application/json" },
    },
  );

  const json = (await response.json()) as
    | { ok: true; data: { job: BackgroundJobView } }
    | { ok: false; error?: unknown };

  if (!response.ok || !("ok" in json) || !json.ok) {
    return {
      ok: false,
      error: getApiErrorMessage(
        "error" in json ? json.error : undefined,
        "Unable to cancel job.",
      ),
    };
  }

  return { ok: true, job: json.data.job };
}

export async function kickWorkerClient(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const response = await fetch("/api/jobs/worker", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ limit: 2 }),
  });

  if (!response.ok) {
    return { ok: false, error: "Unable to start worker." };
  }

  return { ok: true };
}
