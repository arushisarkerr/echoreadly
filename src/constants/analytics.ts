/**
 * Analytics event catalog and date-range helpers.
 */

export const ANALYTICS_EVENT_NAMES = [
  "document_uploaded",
  "document_processed",
  "summary_generated",
  "chat_message",
  "translation_created",
  "tts_generated",
  "export_created",
  "collection_created",
  "collection_item_added",
  "checkout_started",
  "subscription_updated",
  "streaming_ai",
] as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENT_NAMES)[number];

export function isAnalyticsEventName(
  value: unknown,
): value is AnalyticsEventName {
  return (
    typeof value === "string" &&
    (ANALYTICS_EVENT_NAMES as readonly string[]).includes(value)
  );
}

export type AnalyticsRangePreset = "today" | "7d" | "30d" | "custom";

export const ANALYTICS_RANGE_PRESETS: readonly AnalyticsRangePreset[] = [
  "today",
  "7d",
  "30d",
  "custom",
] as const;

export function utcDayString(date = new Date()): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addUtcDays(day: string, delta: number): string {
  const date = new Date(`${day}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + delta);
  return utcDayString(date);
}

export function resolveAnalyticsRange(input: {
  preset?: AnalyticsRangePreset;
  from?: string | null;
  to?: string | null;
}): { from: string; to: string; preset: AnalyticsRangePreset } {
  const today = utcDayString();
  const preset = input.preset ?? "7d";

  if (preset === "today") {
    return { from: today, to: today, preset };
  }
  if (preset === "7d") {
    return { from: addUtcDays(today, -6), to: today, preset };
  }
  if (preset === "30d") {
    return { from: addUtcDays(today, -29), to: today, preset };
  }

  const from = input.from && /^\d{4}-\d{2}-\d{2}$/.test(input.from)
    ? input.from
    : addUtcDays(today, -6);
  const to = input.to && /^\d{4}-\d{2}-\d{2}$/.test(input.to)
    ? input.to
    : today;

  if (from > to) {
    return { from: to, to: from, preset: "custom" };
  }

  return { from, to, preset: "custom" };
}

export function eventLabel(eventName: AnalyticsEventName): string {
  switch (eventName) {
    case "document_uploaded":
      return "Document uploaded";
    case "document_processed":
      return "Document processed";
    case "summary_generated":
      return "AI summary";
    case "chat_message":
      return "AI chat";
    case "translation_created":
      return "Translation";
    case "tts_generated":
      return "TTS narration";
    case "export_created":
      return "Audio export";
    case "collection_created":
      return "Collection created";
    case "collection_item_added":
      return "Added to collection";
    case "checkout_started":
      return "Checkout started";
    case "subscription_updated":
      return "Subscription updated";
    case "streaming_ai":
      return "Streaming AI";
  }
}
