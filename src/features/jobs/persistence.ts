/**
 * Background jobs persistence — service-role writes, user-scoped reads.
 */

import { createHash } from "crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  DEFAULT_JOB_MAX_ATTEMPTS,
  JOB_CLAIM_BATCH_SIZE,
  JOB_STALE_LOCK_SECONDS,
  jobBackoffSeconds,
  type JobStatus,
  type JobType,
} from "@/constants/jobs";
import { createClient, createServiceClient } from "@/lib/supabase/server";

import type {
  BackgroundJobRow,
  BackgroundJobView,
  EnqueueJobInput,
} from "./types";

function service(client?: SupabaseClient): SupabaseClient {
  return client ?? createServiceClient();
}

export function toJobView(row: BackgroundJobRow): BackgroundJobView {
  return {
    id: row.id,
    userId: row.user_id,
    documentId: row.document_id,
    storagePath: row.storage_path,
    jobType: row.job_type,
    status: row.status,
    progress: row.progress,
    currentStep: row.current_step,
    payload: row.payload ?? {},
    result: row.result ?? {},
    errorMessage: row.error_message,
    attempts: row.attempts,
    maxAttempts: row.max_attempts,
    idempotencyKey: row.idempotency_key,
    runAfter: row.run_after,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Stable idempotency key from job type + payload fingerprint. */
export function buildIdempotencyKey(
  jobType: JobType,
  parts: Record<string, unknown>,
): string {
  const normalized = JSON.stringify(parts, Object.keys(parts).sort());
  const digest = createHash("sha256")
    .update(`${jobType}:${normalized}`)
    .digest("hex")
    .slice(0, 40);
  return `${jobType}:${digest}`;
}

export async function enqueueJob(
  input: EnqueueJobInput,
  client?: SupabaseClient,
): Promise<{ job: BackgroundJobRow; created: boolean }> {
  const db = service(client);
  const maxAttempts = Math.min(
    10,
    Math.max(1, input.maxAttempts ?? DEFAULT_JOB_MAX_ATTEMPTS),
  );

  const insertPayload = {
    user_id: input.userId,
    document_id: input.documentId ?? null,
    storage_path: input.storagePath ?? null,
    job_type: input.jobType,
    status: "pending" as const,
    progress: 0,
    current_step: "queued",
    payload: input.payload ?? {},
    result: {},
    attempts: 0,
    max_attempts: maxAttempts,
    idempotency_key: input.idempotencyKey,
    run_after: (input.runAfter ?? new Date()).toISOString(),
  };

  const { data, error } = await db
    .from("background_jobs")
    .insert(insertPayload)
    .select("*")
    .single();

  if (!error && data) {
    return { job: data as BackgroundJobRow, created: true };
  }

  // Unique active idempotency — return existing active job.
  if (error?.code === "23505") {
    const existing = await findActiveJobByIdempotency(
      input.userId,
      input.jobType,
      input.idempotencyKey,
      db,
    );
    if (existing) {
      return { job: existing, created: false };
    }
  }

  throw new Error(error?.message || "Unable to enqueue job.");
}

export async function findActiveJobByIdempotency(
  userId: string,
  jobType: JobType,
  idempotencyKey: string,
  client?: SupabaseClient,
): Promise<BackgroundJobRow | null> {
  const { data, error } = await service(client)
    .from("background_jobs")
    .select("*")
    .eq("user_id", userId)
    .eq("job_type", jobType)
    .eq("idempotency_key", idempotencyKey)
    .in("status", ["pending", "running", "retrying"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as BackgroundJobRow | null) ?? null;
}

export async function getJobByIdForUser(
  jobId: string,
  userId: string,
  client?: SupabaseClient,
): Promise<BackgroundJobRow | null> {
  const db = client ?? (await createClient());
  const { data, error } = await db
    .from("background_jobs")
    .select("*")
    .eq("id", jobId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as BackgroundJobRow | null) ?? null;
}

export async function listJobsForUser(input: {
  userId: string;
  status?: JobStatus | JobStatus[];
  limit?: number;
  client?: SupabaseClient;
}): Promise<BackgroundJobRow[]> {
  const limit = Math.min(Math.max(input.limit ?? 30, 1), 100);
  const db = input.client ?? (await createClient());
  let query = db
    .from("background_jobs")
    .select("*")
    .eq("user_id", input.userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (input.status) {
    const statuses = Array.isArray(input.status)
      ? input.status
      : [input.status];
    query = query.in("status", statuses);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  return (data as BackgroundJobRow[] | null) ?? [];
}

export async function claimJobs(input?: {
  limit?: number;
  workerId?: string;
  client?: SupabaseClient;
}): Promise<BackgroundJobRow[]> {
  const { data, error } = await service(input?.client).rpc(
    "claim_background_jobs",
    {
      p_limit: input?.limit ?? JOB_CLAIM_BATCH_SIZE,
      p_worker_id: input?.workerId ?? `worker-${process.pid}`,
      p_stale_seconds: JOB_STALE_LOCK_SECONDS,
    },
  );

  if (error) {
    throw new Error(error.message);
  }

  return (data as BackgroundJobRow[] | null) ?? [];
}

export async function updateJobProgress(input: {
  jobId: string;
  progress: number;
  currentStep?: string;
  client?: SupabaseClient;
}): Promise<void> {
  const progress = Math.min(100, Math.max(0, Math.round(input.progress)));
  const patch: Record<string, unknown> = { progress };
  if (input.currentStep) {
    patch.current_step = input.currentStep;
  }

  const { error } = await service(input.client)
    .from("background_jobs")
    .update(patch)
    .eq("id", input.jobId)
    .eq("status", "running");

  if (error) {
    throw new Error(error.message);
  }
}

export async function completeJob(input: {
  jobId: string;
  result?: Record<string, unknown>;
  currentStep?: string;
  client?: SupabaseClient;
}): Promise<void> {
  const { error } = await service(input.client)
    .from("background_jobs")
    .update({
      status: "completed",
      progress: 100,
      current_step: input.currentStep ?? "done",
      result: input.result ?? {},
      error_message: null,
      locked_at: null,
      locked_by: null,
      completed_at: new Date().toISOString(),
    })
    .eq("id", input.jobId)
    .eq("status", "running");

  if (error) {
    throw new Error(error.message);
  }
}

export async function failOrRetryJob(input: {
  job: BackgroundJobRow;
  errorMessage: string;
  client?: SupabaseClient;
}): Promise<"retrying" | "failed"> {
  const attempts = input.job.attempts;
  const maxAttempts = input.job.max_attempts;
  const dead = attempts >= maxAttempts;
  const status: JobStatus = dead ? "failed" : "retrying";
  const backoff = jobBackoffSeconds(attempts);
  const runAfter = new Date(Date.now() + backoff * 1000).toISOString();

  const { error } = await service(input.client)
    .from("background_jobs")
    .update({
      status,
      error_message: input.errorMessage.slice(0, 2000),
      current_step: dead ? "dead" : "awaiting_retry",
      locked_at: null,
      locked_by: null,
      run_after: dead ? input.job.run_after : runAfter,
      completed_at: dead ? new Date().toISOString() : null,
      progress: dead ? input.job.progress : Math.min(input.job.progress, 95),
    })
    .eq("id", input.job.id)
    .eq("status", "running");

  if (error) {
    throw new Error(error.message);
  }

  return status;
}

export async function cancelJobForUser(input: {
  jobId: string;
  userId: string;
  client?: SupabaseClient;
}): Promise<BackgroundJobRow | null> {
  const db = input.client ?? (await createClient());
  const { data, error } = await db
    .from("background_jobs")
    .update({
      status: "cancelled",
      current_step: "cancelled",
      completed_at: new Date().toISOString(),
      locked_at: null,
      locked_by: null,
      error_message: null,
    })
    .eq("id", input.jobId)
    .eq("user_id", input.userId)
    .in("status", ["pending", "retrying"])
    .select("*")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as BackgroundJobRow | null) ?? null;
}

export async function runCleanupJobsRpc(input?: {
  olderThanDays?: number;
  limit?: number;
  client?: SupabaseClient;
}): Promise<number> {
  const { data, error } = await service(input?.client).rpc(
    "cleanup_background_jobs",
    {
      p_older_than_days: input?.olderThanDays ?? 14,
      p_limit: input?.limit ?? 500,
    },
  );

  if (error) {
    throw new Error(error.message);
  }

  return typeof data === "number" ? data : Number(data) || 0;
}
