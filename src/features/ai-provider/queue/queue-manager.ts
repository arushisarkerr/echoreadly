import { AiProviderError } from "../errors";
import type { AiCapability, AiQueueJob, AiQueueJobStatus } from "../types";

export type EnqueueAiJobInput = {
  capability: AiCapability;
  priority?: number;
  checkpoint?: Record<string, unknown> | null;
  payload?: Record<string, unknown>;
};

/**
 * In-memory queue stub for future long-running AI jobs.
 * Phase 1: API surface only — no worker processing.
 */
export class QueueManager {
  private readonly jobs = new Map<string, AiQueueJob & { payload?: Record<string, unknown> }>();

  enqueue(input: EnqueueAiJobInput): AiQueueJob {
    const now = new Date().toISOString();
    const id = `aiq_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    const job: AiQueueJob & { payload?: Record<string, unknown> } = {
      id,
      capability: input.capability,
      status: "queued",
      priority: input.priority ?? 100,
      checkpoint: input.checkpoint ?? null,
      errorMessage: null,
      createdAt: now,
      updatedAt: now,
      payload: input.payload,
    };
    this.jobs.set(id, job);
    return this.publicJob(job);
  }

  get(jobId: string): AiQueueJob | null {
    const job = this.jobs.get(jobId);
    return job ? this.publicJob(job) : null;
  }

  pause(jobId: string): AiQueueJob {
    return this.setStatus(jobId, "paused");
  }

  resume(jobId: string): AiQueueJob {
    const job = this.require(jobId);
    if (job.status !== "paused" && job.status !== "failed") {
      throw new AiProviderError({
        code: "validation_failed",
        message: `Job ${jobId} cannot be resumed from status ${job.status}.`,
      });
    }
    return this.setStatus(jobId, "queued");
  }

  cancel(jobId: string): AiQueueJob {
    return this.setStatus(jobId, "cancelled");
  }

  retry(jobId: string): AiQueueJob {
    const job = this.require(jobId);
    if (job.status !== "failed") {
      throw new AiProviderError({
        code: "validation_failed",
        message: `Job ${jobId} cannot be retried from status ${job.status}.`,
      });
    }
    job.errorMessage = null;
    return this.setStatus(jobId, "queued");
  }

  updateCheckpoint(jobId: string, checkpoint: Record<string, unknown>): AiQueueJob {
    const job = this.require(jobId);
    job.checkpoint = checkpoint;
    job.updatedAt = new Date().toISOString();
    return this.publicJob(job);
  }

  list(status?: AiQueueJobStatus): AiQueueJob[] {
    return [...this.jobs.values()]
      .filter((job) => (status ? job.status === status : true))
      .sort((a, b) => a.priority - b.priority || a.createdAt.localeCompare(b.createdAt))
      .map((job) => this.publicJob(job));
  }

  private setStatus(jobId: string, status: AiQueueJobStatus): AiQueueJob {
    const job = this.require(jobId);
    job.status = status;
    job.updatedAt = new Date().toISOString();
    return this.publicJob(job);
  }

  private require(jobId: string) {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new AiProviderError({
        code: "validation_failed",
        message: `Unknown AI queue job: ${jobId}`,
      });
    }
    return job;
  }

  private publicJob(
    job: AiQueueJob & { payload?: Record<string, unknown> },
  ): AiQueueJob {
    return {
      id: job.id,
      capability: job.capability,
      status: job.status,
      priority: job.priority,
      checkpoint: job.checkpoint ?? null,
      errorMessage: job.errorMessage ?? null,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    };
  }
}
