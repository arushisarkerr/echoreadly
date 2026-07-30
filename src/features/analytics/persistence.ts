/**
 * Analytics persistence — daily counters and activity feed.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import { createServiceClient } from "@/lib/supabase/server";

import type { AnalyticsActivityRow, AnalyticsDailyRow } from "./types";

function service(client?: SupabaseClient): SupabaseClient {
  return client ?? createServiceClient();
}

export async function incrementAnalyticsDaily(input: {
  userId: string;
  day: string;
  eventName: string;
  amount?: number;
  value?: number;
  client?: SupabaseClient;
}): Promise<number> {
  const { data, error } = await service(input.client).rpc(
    "increment_analytics_daily",
    {
      p_user_id: input.userId,
      p_day: input.day,
      p_event_name: input.eventName,
      p_amount: input.amount ?? 1,
      p_value: input.value ?? 0,
    },
  );

  if (error) {
    throw new Error(error.message);
  }

  return typeof data === "number" ? data : Number(data) || 0;
}

export async function insertAnalyticsActivity(input: {
  userId: string;
  eventName: string;
  label: string;
  documentId?: string | null;
  storagePath?: string | null;
  metadata?: Record<string, unknown>;
  client?: SupabaseClient;
}): Promise<AnalyticsActivityRow> {
  const { data, error } = await service(input.client)
    .from("analytics_activity")
    .insert({
      user_id: input.userId,
      event_name: input.eventName,
      label: input.label,
      document_id: input.documentId ?? null,
      storage_path: input.storagePath ?? null,
      metadata: input.metadata ?? {},
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Unable to save analytics activity.");
  }

  return data as AnalyticsActivityRow;
}

export async function listAnalyticsDaily(input: {
  userId: string;
  from: string;
  to: string;
  client?: SupabaseClient;
}): Promise<AnalyticsDailyRow[]> {
  const { data, error } = await service(input.client)
    .from("analytics_daily")
    .select("*")
    .eq("user_id", input.userId)
    .gte("day", input.from)
    .lte("day", input.to)
    .order("day", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data as AnalyticsDailyRow[] | null) ?? [];
}

export async function listRecentAnalyticsActivity(input: {
  userId: string;
  limit?: number;
  client?: SupabaseClient;
}): Promise<AnalyticsActivityRow[]> {
  const limit = Math.min(Math.max(input.limit ?? 20, 1), 50);
  const { data, error } = await service(input.client)
    .from("analytics_activity")
    .select("*")
    .eq("user_id", input.userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  return (data as AnalyticsActivityRow[] | null) ?? [];
}
