import type { ProcessingStatus } from "@/features/library/types";

/**
 * Display labels for processing_status:
 * Queued → Processing → Completed → Failed.
 */
export function processingStatusLabel(status: ProcessingStatus): string {
  switch (status) {
    case "uploaded":
      return "Queued";
    case "processing":
      return "Processing";
    case "ready":
      return "Completed";
    case "failed":
      return "Failed";
    default:
      return status;
  }
}
