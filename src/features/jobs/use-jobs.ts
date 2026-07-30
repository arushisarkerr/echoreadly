"use client";

import { useCallback, useEffect, useState } from "react";

import {
  cancelJobClient,
  fetchJob,
  fetchJobs,
  kickWorkerClient,
} from "./jobs-client";
import type { BackgroundJobView } from "./types";

export type UseJobsState = {
  status: "loading" | "ready" | "error";
  jobs: BackgroundJobView[];
  error: string | null;
  refresh: () => Promise<void>;
  cancel: (jobId: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  kickWorker: () => Promise<void>;
};

/**
 * Polls background jobs while any are active.
 */
export function useJobs(): UseJobsState {
  const [status, setStatus] = useState<UseJobsState["status"]>("loading");
  const [jobs, setJobs] = useState<BackgroundJobView[]>([]);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const result = await fetchJobs({ limit: 40 });
    if (!result.ok) {
      setStatus("error");
      setError(result.error);
      return;
    }
    setJobs(result.jobs);
    setError(null);
    setStatus("ready");
  }, []);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const result = await fetchJobs({ limit: 40 });
      if (cancelled) return;
      if (!result.ok) {
        setError(result.error);
        setStatus("error");
        return;
      }
      setJobs(result.jobs);
      setStatus("ready");
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const active = jobs.some((job) =>
      ["pending", "running", "retrying"].includes(String(job.status)),
    );
    if (!active) {
      return;
    }

    const timer = window.setInterval(() => {
      void refresh();
    }, 2500);

    return () => {
      window.clearInterval(timer);
    };
  }, [jobs, refresh]);

  return {
    status,
    jobs,
    error,
    refresh,
    cancel: async (jobId) => {
      const result = await cancelJobClient(jobId);
      if (!result.ok) {
        return result;
      }
      await refresh();
      return { ok: true as const };
    },
    kickWorker: async () => {
      await kickWorkerClient();
      await refresh();
    },
  };
}

/**
 * Poll a single job until terminal.
 */
export function useJob(jobId: string | null): {
  job: BackgroundJobView | null;
  error: string | null;
} {
  const [job, setJob] = useState<BackgroundJobView | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId) {
      return;
    }

    let cancelled = false;

    const tick = async () => {
      const result = await fetchJob(jobId);
      if (cancelled) return;
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setJob(result.job);
      setError(null);
    };

    void tick();
    const timer = window.setInterval(() => {
      void tick();
    }, 2000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [jobId]);

  return { job, error };
}
