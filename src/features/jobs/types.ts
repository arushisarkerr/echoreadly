/**
 * Background jobs feature types.
 */

import type { JobStatus, JobType } from "@/constants/jobs";

export type BackgroundJobRow = {
  id: string;
  user_id: string;
  document_id: string | null;
  storage_path: string | null;
  job_type: JobType | string;
  status: JobStatus | string;
  progress: number;
  current_step: string | null;
  payload: Record<string, unknown>;
  result: Record<string, unknown>;
  error_message: string | null;
  attempts: number;
  max_attempts: number;
  idempotency_key: string;
  locked_at: string | null;
  locked_by: string | null;
  run_after: string;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type BackgroundJobView = {
  id: string;
  userId: string;
  documentId: string | null;
  storagePath: string | null;
  jobType: JobType | string;
  status: JobStatus | string;
  progress: number;
  currentStep: string | null;
  payload: Record<string, unknown>;
  result: Record<string, unknown>;
  errorMessage: string | null;
  attempts: number;
  maxAttempts: number;
  idempotencyKey: string;
  runAfter: string;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type EnqueueJobInput = {
  userId: string;
  jobType: JobType;
  payload?: Record<string, unknown>;
  documentId?: string | null;
  storagePath?: string | null;
  idempotencyKey: string;
  maxAttempts?: number;
  runAfter?: Date;
};

export type JobHandlerContext = {
  job: BackgroundJobRow;
  updateProgress: (progress: number, step?: string) => Promise<void>;
  signal: AbortSignal;
};

export type JobHandlerResult = {
  result?: Record<string, unknown>;
  step?: string;
};

export type JobHandler = (
  ctx: JobHandlerContext,
) => Promise<JobHandlerResult | void>;
