/**
 * Server analytics overview aggregation.
 */

import {
  addUtcDays,
  eventLabel,
  resolveAnalyticsRange,
  type AnalyticsEventName,
  type AnalyticsRangePreset,
} from "@/constants/analytics";
import { getEntitlement } from "@/features/billing/entitlements";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

import {
  listAnalyticsDaily,
  listRecentAnalyticsActivity,
} from "./persistence";
import type {
  AnalyticsKpis,
  AnalyticsOverview,
  AnalyticsSeriesPoint,
} from "./types";

const AI_EVENTS: AnalyticsEventName[] = [
  "summary_generated",
  "chat_message",
  "translation_created",
  "tts_generated",
  "streaming_ai",
];

function emptySeriesPoint(day: string): AnalyticsSeriesPoint {
  return {
    day,
    readingMinutes: 0,
    documents: 0,
    ai: 0,
    summary: 0,
    chat: 0,
    translation: 0,
    tts: 0,
    export: 0,
    streaming: 0,
  };
}

function enumerateDays(from: string, to: string): string[] {
  const days: string[] = [];
  let cursor = from;
  while (cursor <= to) {
    days.push(cursor);
    cursor = addUtcDays(cursor, 1);
    if (days.length > 400) {
      break;
    }
  }
  return days;
}

async function deriveReadingStats(userId: string): Promise<{
  totalReadingMinutes: number;
  pagesReadEstimate: number;
  documentsCompletedEstimate: number;
  streakDays: number;
  readingByDay: Map<string, number>;
}> {
  const client = await createClient();
  const { data: progress, error } = await client
    .from("document_listening_progress")
    .select(
      "playback_seconds, page_number, page_count, last_opened_at, updated_at",
    )
    .eq("user_id", userId);

  if (error) {
    logger.warn("Analytics reading lookup failed", { userId }, error.message);
    return {
      totalReadingMinutes: 0,
      pagesReadEstimate: 0,
      documentsCompletedEstimate: 0,
      streakDays: 0,
      readingByDay: new Map(),
    };
  }

  const rows = progress ?? [];
  let totalSeconds = 0;
  let pagesReadEstimate = 0;
  let documentsCompletedEstimate = 0;
  const daySet = new Set<string>();
  const readingByDay = new Map<string, number>();

  for (const row of rows) {
    const seconds = Number(row.playback_seconds) || 0;
    totalSeconds += Math.max(0, seconds);

    const page = Number(row.page_number) || 0;
    const numPages = Number(row.page_count) || 0;
    if (page > 0) {
      pagesReadEstimate += page;
    }
    if (numPages > 0 && page >= numPages) {
      documentsCompletedEstimate += 1;
    }

    const stamp = row.last_opened_at || row.updated_at;
    if (typeof stamp === "string" && stamp.length >= 10) {
      const day = stamp.slice(0, 10);
      daySet.add(day);
      const minutes = Math.round(Math.max(0, seconds) / 60);
      readingByDay.set(day, (readingByDay.get(day) ?? 0) + minutes);
    }
  }

  // Streak: consecutive UTC days ending today with any open activity.
  let streakDays = 0;
  const today = new Date();
  for (let i = 0; i < 365; i += 1) {
    const d = new Date(
      Date.UTC(
        today.getUTCFullYear(),
        today.getUTCMonth(),
        today.getUTCDate() - i,
      ),
    );
    const key = d.toISOString().slice(0, 10);
    if (daySet.has(key)) {
      streakDays += 1;
    } else if (i === 0) {
      continue;
    } else {
      break;
    }
  }

  return {
    totalReadingMinutes: Math.round(totalSeconds / 60),
    pagesReadEstimate,
    documentsCompletedEstimate,
    streakDays,
    readingByDay,
  };
}

async function countOwnedDocuments(userId: string): Promise<number> {
  const client = await createClient();
  const { count, error } = await client
    .from("documents")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if (error) {
    logger.warn("Analytics documents count failed", { userId }, error.message);
    return 0;
  }

  return count ?? 0;
}

/**
 * Build the analytics dashboard overview for a signed-in user.
 */
export async function getAnalyticsOverview(input: {
  userId: string;
  preset?: AnalyticsRangePreset;
  from?: string | null;
  to?: string | null;
}): Promise<AnalyticsOverview> {
  const range = resolveAnalyticsRange({
    preset: input.preset,
    from: input.from,
    to: input.to,
  });

  const service = createServiceClient();

  const [daily, activity, reading, totalDocuments, entitlement] =
    await Promise.all([
      listAnalyticsDaily({
        userId: input.userId,
        from: range.from,
        to: range.to,
        client: service,
      }).catch((error) => {
        logger.warn(
          "Analytics daily list failed",
          { userId: input.userId },
          error,
        );
        return [];
      }),
      listRecentAnalyticsActivity({
        userId: input.userId,
        limit: 20,
        client: service,
      }).catch((error) => {
        logger.warn(
          "Analytics activity list failed",
          { userId: input.userId },
          error,
        );
        return [];
      }),
      deriveReadingStats(input.userId),
      countOwnedDocuments(input.userId),
      getEntitlement(input.userId).catch(() => null),
    ]);

  const days = enumerateDays(range.from, range.to);
  const seriesMap = new Map(days.map((day) => [day, emptySeriesPoint(day)]));

  const totalsByEvent: Record<string, number> = {};
  let documentsInRange = 0;
  let aiRequestsInRange = 0;

  for (const row of daily) {
    const point = seriesMap.get(row.day);
    if (!point) {
      continue;
    }

    totalsByEvent[row.event_name] =
      (totalsByEvent[row.event_name] ?? 0) + row.count;

    switch (row.event_name) {
      case "document_uploaded":
        point.documents += row.count;
        documentsInRange += row.count;
        break;
      case "summary_generated":
        point.summary += row.count;
        point.ai += row.count;
        aiRequestsInRange += row.count;
        break;
      case "chat_message":
        point.chat += row.count;
        point.ai += row.count;
        aiRequestsInRange += row.count;
        break;
      case "translation_created":
        point.translation += row.count;
        point.ai += row.count;
        aiRequestsInRange += row.count;
        break;
      case "tts_generated":
        point.tts += row.count;
        point.ai += row.count;
        aiRequestsInRange += row.count;
        break;
      case "export_created":
        point.export += row.count;
        break;
      case "streaming_ai":
        point.streaming += row.count;
        point.ai += row.count;
        aiRequestsInRange += row.count;
        break;
      default:
        break;
    }
  }

  let readingMinutesInRange = 0;
  for (const day of days) {
    const minutes = reading.readingByDay.get(day) ?? 0;
    const point = seriesMap.get(day);
    if (point) {
      point.readingMinutes = minutes;
    }
    readingMinutesInRange += minutes;
  }

  let mostUsedAiFeature: AnalyticsEventName | null = null;
  let mostUsedAiFeatureCount = 0;
  for (const name of AI_EVENTS) {
    const count = totalsByEvent[name] ?? 0;
    if (count > mostUsedAiFeatureCount) {
      mostUsedAiFeature = name;
      mostUsedAiFeatureCount = count;
    }
  }

  const allTimeAi =
    (totalsByEvent.summary_generated ?? 0) +
    (totalsByEvent.chat_message ?? 0) +
    (totalsByEvent.translation_created ?? 0) +
    (totalsByEvent.tts_generated ?? 0) +
    (totalsByEvent.streaming_ai ?? 0);

  // Prefer lifetime AI from entitlement usage when available (more complete).
  const entitlementAi = entitlement
    ? (entitlement.usage.summaries ?? 0) +
      (entitlement.usage.chat ?? 0) +
      (entitlement.usage.translation ?? 0) +
      (entitlement.usage.tts ?? 0)
    : allTimeAi;

  const kpis: AnalyticsKpis = {
    totalDocuments,
    documentsInRange,
    totalReadingMinutes: reading.totalReadingMinutes,
    readingMinutesInRange,
    totalAiRequests: Math.max(entitlementAi, allTimeAi),
    aiRequestsInRange,
    pagesReadEstimate: reading.pagesReadEstimate,
    documentsCompletedEstimate: reading.documentsCompletedEstimate,
    readingStreakDays: reading.streakDays,
    mostUsedAiFeature,
    mostUsedAiFeatureCount,
  };

  return {
    range,
    kpis,
    series: days.map((day) => seriesMap.get(day) ?? emptySeriesPoint(day)),
    totalsByEvent,
    recentActivity: activity.map((row) => ({
      id: row.id,
      eventName: row.event_name,
      label: row.label || eventLabel(row.event_name as AnalyticsEventName),
      createdAt: row.created_at,
      storagePath: row.storage_path,
    })),
    plan: {
      planId: entitlement?.planId ?? "free",
      planName: entitlement?.planName ?? "Free",
      status: entitlement?.status ?? "free",
      usage: entitlement?.usage ?? {},
      limits: entitlement?.limits ?? {},
    },
  };
}
