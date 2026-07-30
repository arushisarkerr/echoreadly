/**
 * Background jobs feature — client-safe exports.
 * Server: import enqueue / runner / persistence directly.
 */

export { JobsWorkspace } from "./jobs-workspace";
export {
  cancelJobClient,
  enqueueJobClient,
  fetchJob,
  fetchJobs,
  kickWorkerClient,
} from "./jobs-client";
export { useJob, useJobs, type UseJobsState } from "./use-jobs";
export type { BackgroundJobView } from "./types";
