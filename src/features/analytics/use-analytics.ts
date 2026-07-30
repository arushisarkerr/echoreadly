"use client";

import { useCallback, useEffect, useState } from "react";

import type { AnalyticsRangePreset } from "@/constants/analytics";

import { fetchAnalyticsOverview } from "./analytics-client";
import type { AnalyticsOverview } from "./types";

export type UseAnalyticsState = {
  status: "loading" | "ready" | "error";
  overview: AnalyticsOverview | null;
  error: string | null;
  preset: AnalyticsRangePreset;
  from: string;
  to: string;
  setPreset: (preset: AnalyticsRangePreset) => void;
  setCustomRange: (from: string, to: string) => void;
  refresh: () => Promise<void>;
};

/**
 * Analytics dashboard data hook with date-range filters.
 */
export function useAnalytics(): UseAnalyticsState {
  const [status, setStatus] = useState<UseAnalyticsState["status"]>("loading");
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preset, setPresetState] = useState<AnalyticsRangePreset>("7d");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const refresh = useCallback(async () => {
    setStatus("loading");
    setError(null);

    const result = await fetchAnalyticsOverview({
      preset,
      from: preset === "custom" ? from : undefined,
      to: preset === "custom" ? to : undefined,
    });

    if (!result.ok) {
      setStatus("error");
      setError(result.error);
      return;
    }

    setOverview(result.data);
    if (result.data.range.preset === "custom") {
      setFrom(result.data.range.from);
      setTo(result.data.range.to);
    }
    setStatus("ready");
  }, [from, preset, to]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const result = await fetchAnalyticsOverview({
        preset,
        from: preset === "custom" ? from : undefined,
        to: preset === "custom" ? to : undefined,
      });
      if (cancelled) {
        return;
      }
      if (!result.ok) {
        setError(result.error);
        setStatus("error");
        return;
      }
      setOverview(result.data);
      setStatus("ready");
    })();

    return () => {
      cancelled = true;
    };
  }, [preset, from, to]);

  return {
    status,
    overview,
    error,
    preset,
    from,
    to,
    setPreset: (next) => {
      setPresetState(next);
    },
    setCustomRange: (nextFrom, nextTo) => {
      setFrom(nextFrom);
      setTo(nextTo);
      setPresetState("custom");
    },
    refresh,
  };
}
