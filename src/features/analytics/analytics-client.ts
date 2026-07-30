/**
 * Client analytics helpers.
 */

import { getApiErrorMessage } from "@/utils";

import type { AnalyticsRangePreset } from "@/constants/analytics";
import type { AnalyticsOverview } from "./types";

export async function fetchAnalyticsOverview(input: {
  preset: AnalyticsRangePreset;
  from?: string;
  to?: string;
}): Promise<
  { ok: true; data: AnalyticsOverview } | { ok: false; error: string }
> {
  const params = new URLSearchParams({ preset: input.preset });
  if (input.preset === "custom") {
    if (input.from) params.set("from", input.from);
    if (input.to) params.set("to", input.to);
  }

  const response = await fetch(`/api/analytics/overview?${params.toString()}`, {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  const json = (await response.json()) as
    | { ok: true; data: AnalyticsOverview }
    | { ok: false; error?: unknown };

  if (!response.ok || !("ok" in json) || !json.ok) {
    return {
      ok: false,
      error: getApiErrorMessage(
        "error" in json ? json.error : undefined,
        "Unable to load analytics.",
      ),
    };
  }

  return { ok: true, data: json.data };
}

/**
 * Fire-and-forget validated collection analytics (server ownership-checked).
 */
export function reportCollectionAnalytics(input: {
  eventName: "collection_created" | "collection_item_added";
  collectionId: string;
  storagePath?: string;
  label?: string;
}): void {
  void fetch("/api/analytics/events", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  }).catch(() => {
    // Best-effort — never block UI.
  });
}
