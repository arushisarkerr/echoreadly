/**
 * Enqueue helpers for product features — idempotent + worker kick.
 */

import type { JobType } from "@/constants/jobs";
import { logger } from "@/lib/logger";

import {
  buildIdempotencyKey,
  enqueueJob,
  toJobView,
} from "./persistence";
import { kickJobWorker } from "./runner";
import type { BackgroundJobView, EnqueueJobInput } from "./types";

export type EnqueueResult = {
  job: BackgroundJobView;
  created: boolean;
};

export async function enqueueBackgroundJob(
  input: Omit<EnqueueJobInput, "idempotencyKey"> & {
    idempotencyKey?: string;
    kick?: boolean;
  },
): Promise<EnqueueResult> {
  const idempotencyKey =
    input.idempotencyKey ??
    buildIdempotencyKey(input.jobType, {
      documentId: input.documentId ?? null,
      storagePath: input.storagePath ?? null,
      ...(input.payload ?? {}),
    });

  try {
    const { job, created } = await enqueueJob({
      ...input,
      idempotencyKey,
    });

    if (input.kick !== false) {
      kickJobWorker(`kick-${input.jobType}`);
    }

    return { job: toJobView(job), created };
  } catch (error) {
    logger.warn(
      "Enqueue job failed",
      { userId: input.userId, jobType: input.jobType },
      error,
    );
    throw error;
  }
}

export async function enqueueDocumentProcessJob(input: {
  userId: string;
  storagePath: string;
  originalFileName?: string;
  fileSize?: number;
}): Promise<EnqueueResult> {
  return enqueueBackgroundJob({
    userId: input.userId,
    jobType: "document_process",
    storagePath: input.storagePath,
    payload: {
      storagePath: input.storagePath,
      originalFileName: input.originalFileName,
      fileSize: input.fileSize,
    },
  });
}

export function assertEnqueueableJobType(jobType: JobType): JobType {
  return jobType;
}
