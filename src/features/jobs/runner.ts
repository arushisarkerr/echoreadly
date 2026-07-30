/**
 * Background job runner — claim, execute, complete / retry.
 */

import { JOB_CLAIM_BATCH_SIZE, JOB_HANDLER_TIMEOUT_MS } from "@/constants/jobs";
import { logger } from "@/lib/logger";

import { JOB_HANDLERS } from "./handlers";
import {
  claimJobs,
  completeJob,
  failOrRetryJob,
  updateJobProgress,
} from "./persistence";
import type { BackgroundJobRow, JobHandlerResult } from "./types";
import type { JobType } from "@/constants/jobs";

export type ProcessJobsResult = {
  claimed: number;
  completed: number;
  failed: number;
  retrying: number;
};

function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  signal: AbortSignal,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Job timed out after ${ms}ms.`));
    }, ms);

    const onAbort = () => {
      clearTimeout(timer);
      reject(new Error("Job aborted."));
    };

    if (signal.aborted) {
      onAbort();
      return;
    }

    signal.addEventListener("abort", onAbort, { once: true });

    promise.then(
      (value) => {
        clearTimeout(timer);
        signal.removeEventListener("abort", onAbort);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        signal.removeEventListener("abort", onAbort);
        reject(error);
      },
    );
  });
}

async function executeJob(job: BackgroundJobRow): Promise<"completed" | "retrying" | "failed"> {
  const controller = new AbortController();
  const handler = JOB_HANDLERS[job.job_type as JobType];

  if (!handler) {
    await failOrRetryJob({
      job,
      errorMessage: `Unsupported job type: ${job.job_type}`,
    });
    return job.attempts >= job.max_attempts ? "failed" : "retrying";
  }

  try {
    const outcome = await withTimeout(
      handler({
        job,
        signal: controller.signal,
        updateProgress: async (progress, step) => {
          await updateJobProgress({
            jobId: job.id,
            progress,
            currentStep: step,
          });
        },
      }),
      JOB_HANDLER_TIMEOUT_MS,
      controller.signal,
    );

    const result = (outcome ?? {}) as JobHandlerResult;
    await completeJob({
      jobId: job.id,
      result: result.result ?? {},
      currentStep: result.step ?? "done",
    });
    return "completed";
  } catch (error) {
    controller.abort();
    const message =
      error instanceof Error ? error.message : "Job execution failed.";
    const status = await failOrRetryJob({ job, errorMessage: message });
    logger.warn(
      "Background job ended with error",
      {
        jobId: job.id,
        jobType: job.job_type,
        userId: job.user_id,
        status,
      },
      error,
    );
    return status;
  }
}

/**
 * Claim and process a batch of due jobs. Safe to call from API routes / cron.
 */
export async function processJobBatch(input?: {
  limit?: number;
  workerId?: string;
}): Promise<ProcessJobsResult> {
  const claimed = await claimJobs({
    limit: input?.limit ?? JOB_CLAIM_BATCH_SIZE,
    workerId: input?.workerId,
  });

  let completed = 0;
  let failed = 0;
  let retrying = 0;

  // Sequential execution keeps PDFium / memory usage bounded.
  for (const job of claimed) {
    const status = await executeJob(job);
    if (status === "completed") completed += 1;
    else if (status === "failed") failed += 1;
    else retrying += 1;
  }

  return {
    claimed: claimed.length,
    completed,
    failed,
    retrying,
  };
}

let kickInFlight = false;

/**
 * Fire-and-forget worker kick — never blocks the parent request.
 */
export function kickJobWorker(workerId?: string): void {
  if (kickInFlight) {
    return;
  }
  kickInFlight = true;
  void processJobBatch({ workerId })
    .catch((error) => {
      logger.warn("Background worker kick failed", {}, error);
    })
    .finally(() => {
      kickInFlight = false;
    });
}
