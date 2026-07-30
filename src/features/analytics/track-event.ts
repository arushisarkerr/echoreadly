/**
 * Fire-and-forget analytics tracking — never fails the parent request.
 */

import {
  eventLabel,
  utcDayString,
  type AnalyticsEventName,
} from "@/constants/analytics";
import { logger } from "@/lib/logger";

import {
  incrementAnalyticsDaily,
  insertAnalyticsActivity,
} from "./persistence";

export type TrackAnalyticsEventInput = {
  userId: string;
  eventName: AnalyticsEventName;
  amount?: number;
  value?: number;
  label?: string;
  documentId?: string | null;
  storagePath?: string | null;
  metadata?: Record<string, unknown>;
  /** When false, skip activity feed (default true for meaningful events). */
  activity?: boolean;
};

/**
 * Increment daily aggregate and optionally append to the recent activity feed.
 */
export async function trackAnalyticsEvent(
  input: TrackAnalyticsEventInput,
): Promise<void> {
  try {
    const day = utcDayString();
    await incrementAnalyticsDaily({
      userId: input.userId,
      day,
      eventName: input.eventName,
      amount: input.amount ?? 1,
      value: input.value ?? 0,
    });

    if (input.activity === false) {
      return;
    }

    await insertAnalyticsActivity({
      userId: input.userId,
      eventName: input.eventName,
      label: input.label ?? eventLabel(input.eventName),
      documentId: input.documentId,
      storagePath: input.storagePath,
      metadata: input.metadata,
    });
  } catch (error) {
    logger.warn(
      "Analytics track failed",
      {
        userId: input.userId,
        eventName: input.eventName,
      },
      error,
    );
  }
}

/**
 * Convenience: track without awaiting (non-blocking for hot paths).
 */
export function trackAnalyticsEventAsync(
  input: TrackAnalyticsEventInput,
): void {
  void trackAnalyticsEvent(input);
}
