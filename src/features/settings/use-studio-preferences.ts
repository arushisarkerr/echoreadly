"use client";

import { useEffect, useState } from "react";

import { loadUserPreferences } from "@/features/settings/preferences-client";
import type { UserPreferences } from "@/features/settings/types";
import { createDefaultUserPreferences } from "@/features/settings/defaults";

/**
 * Lightweight preferences load for studio surfaces (reader playback defaults).
 */
export function useStudioPreferences(): {
  preferences: UserPreferences;
  loading: boolean;
} {
  const [preferences, setPreferences] = useState<UserPreferences>(
    createDefaultUserPreferences(),
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const result = await loadUserPreferences();
      if (cancelled) {
        return;
      }
      if (result.ok) {
        setPreferences(result.data.preferences);
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { preferences, loading };
}
