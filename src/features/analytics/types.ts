/**
 * Analytics feature types — overview dashboard payloads.
 */

import type {
  AnalyticsEventName,
  AnalyticsRangePreset,
} from "@/constants/analytics";
import type { PlanId } from "@/constants";

export type AnalyticsDailyRow = {
  user_id: string;
  day: string;
  event_name: string;
  count: number;
  total_value: number;
  updated_at: string;
};

export type AnalyticsActivityRow = {
  id: string;
  user_id: string;
  event_name: string;
  label: string;
  document_id: string | null;
  storage_path: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type AnalyticsSeriesPoint = {
  day: string;
  readingMinutes: number;
  documents: number;
  ai: number;
  summary: number;
  chat: number;
  translation: number;
  tts: number;
  export: number;
  streaming: number;
};

export type AnalyticsKpis = {
  totalDocuments: number;
  documentsInRange: number;
  totalReadingMinutes: number;
  readingMinutesInRange: number;
  totalAiRequests: number;
  aiRequestsInRange: number;
  pagesReadEstimate: number;
  documentsCompletedEstimate: number;
  readingStreakDays: number;
  mostUsedAiFeature: AnalyticsEventName | null;
  mostUsedAiFeatureCount: number;
};

export type AnalyticsPlanSnapshot = {
  planId: PlanId;
  planName: string;
  status: string;
  usage: Record<string, number>;
  limits: Record<string, number>;
};

export type AnalyticsActivityItem = {
  id: string;
  eventName: AnalyticsEventName | string;
  label: string;
  createdAt: string;
  storagePath: string | null;
};

export type AnalyticsOverview = {
  range: {
    preset: AnalyticsRangePreset;
    from: string;
    to: string;
  };
  kpis: AnalyticsKpis;
  series: AnalyticsSeriesPoint[];
  totalsByEvent: Record<string, number>;
  recentActivity: AnalyticsActivityItem[];
  plan: AnalyticsPlanSnapshot;
};
