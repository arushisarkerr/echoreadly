"use client";

import { jobTypeLabel, type JobType } from "@/constants/jobs";
import { ROUTES } from "@/constants";
import { WorkspaceCanvas } from "@/features/dashboard/workspace-canvas";
import { cn } from "@/utils";

import { useJobs } from "./use-jobs";

/**
 * Background jobs workspace — queue status, progress, cancel.
 */
export function JobsWorkspace() {
  const jobs = useJobs();

  return (
    <WorkspaceCanvas
      kicker="Background jobs"
      title="Work that stays off the Reader."
      description="Document processing, AI, TTS, export, and maintenance run in a durable queue with retries — so the studio stays responsive."
      actionHref={ROUTES.library}
      actionLabel="Open Library"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          Active jobs poll every few seconds. Cancel only works before a worker
          claims the job.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              void jobs.refresh();
            }}
            className="inline-flex h-9 items-center rounded-full border border-border/80 bg-background/50 px-3.5 text-xs font-semibold text-foreground transition-colors hover:bg-surface-muted"
          >
            Refresh
          </button>
          <button
            type="button"
            onClick={() => {
              void jobs.kickWorker();
            }}
            className="inline-flex h-9 items-center rounded-full border border-foreground bg-foreground px-3.5 text-xs font-semibold text-background transition-opacity hover:opacity-90"
          >
            Process now
          </button>
        </div>
      </div>

      {jobs.error ? (
        <div
          role="alert"
          className="mt-6 rounded-[1.5rem] border border-danger/30 bg-[color-mix(in_srgb,var(--danger)_8%,transparent)] px-4 py-4"
        >
          <p className="text-sm font-semibold text-danger">
            Couldn’t load jobs
          </p>
          <p className="mt-1 text-sm text-muted">{jobs.error}</p>
        </div>
      ) : null}

      {jobs.status === "loading" && jobs.jobs.length === 0 ? (
        <p className="mt-8 text-sm text-muted" role="status">
          Loading job queue…
        </p>
      ) : null}

      {jobs.status === "ready" && jobs.jobs.length === 0 ? (
        <div className="mt-8 rounded-[1.5rem] border border-border/70 bg-surface/50 px-5 py-8 text-center">
          <p className="font-display text-xl font-semibold text-foreground">
            Queue is clear
          </p>
          <p className="mt-2 text-sm text-muted">
            Upload a document or enqueue AI work to see background progress
            here.
          </p>
        </div>
      ) : null}

      {jobs.jobs.length > 0 ? (
        <ul className="mt-6 space-y-3">
          {jobs.jobs.map((job) => {
            const label = jobTypeLabel(job.jobType as JobType);
            const canCancel = ["pending", "retrying"].includes(
              String(job.status),
            );
            return (
              <li
                key={job.id}
                className="rounded-[1.5rem] border border-border/70 bg-surface/50 px-4 py-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {label}
                    </p>
                    <p className="mt-1 text-xs text-subtle">
                      {String(job.status)}
                      {job.currentStep ? ` · ${job.currentStep}` : ""}
                      {` · attempt ${job.attempts}/${job.maxAttempts}`}
                    </p>
                  </div>
                  {canCancel ? (
                    <button
                      type="button"
                      onClick={() => {
                        void jobs.cancel(job.id);
                      }}
                      className="inline-flex h-8 items-center rounded-full border border-border/80 px-3 text-xs font-semibold text-foreground hover:bg-surface-muted"
                    >
                      Cancel
                    </button>
                  ) : null}
                </div>

                <div className="mt-3 h-2 overflow-hidden rounded-full bg-background/70">
                  <div
                    className={cn(
                      "h-full rounded-full transition-[width] duration-500",
                      job.status === "failed"
                        ? "bg-danger"
                        : job.status === "completed"
                          ? "bg-[color:var(--accent)]"
                          : "bg-foreground/80",
                    )}
                    style={{ width: `${Math.max(4, job.progress)}%` }}
                  />
                </div>

                {job.errorMessage ? (
                  <p className="mt-2 text-xs text-danger">{job.errorMessage}</p>
                ) : null}

                <p className="mt-2 text-[0.7rem] text-subtle">
                  Updated {new Date(job.updatedAt).toLocaleString()}
                </p>
              </li>
            );
          })}
        </ul>
      ) : null}
    </WorkspaceCanvas>
  );
}
