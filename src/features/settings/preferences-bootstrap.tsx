"use client";

import { useEffect, useRef } from "react";

import { loadUserPreferences } from "./preferences-client";
import {
  applyReadingPreferences,
  persistThemePreference,
} from "./theme";

/**
 * Hydrate account preferences once for the authenticated dashboard shell.
 * Applies theme + reading tokens without changing layout chrome.
 */
export function PreferencesBootstrap() {
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) {
      return;
    }
    ranRef.current = true;

    let cancelled = false;

    void (async () => {
      const result = await loadUserPreferences();
      if (cancelled || !result.ok) {
        return;
      }

      persistThemePreference(result.data.preferences.themePreference);
      applyReadingPreferences({
        fontSize: result.data.preferences.fontSize,
        readingWidth: result.data.preferences.readingWidth,
      });
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
