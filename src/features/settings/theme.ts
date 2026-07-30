/**
 * Theme apply helpers shared by Settings and ThemeToggle.
 */

import {
  THEME_STORAGE_KEY,
  type ThemePreference,
} from "./types";

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === "light" || value === "dark" || value === "system";
}

export function applyThemePreference(mode: ThemePreference): void {
  if (typeof document === "undefined") {
    return;
  }

  const root = document.documentElement;
  if (mode === "system") {
    root.removeAttribute("data-theme");
  } else {
    root.setAttribute("data-theme", mode);
  }
}

export function readStoredThemePreference(): ThemePreference {
  if (typeof window === "undefined") {
    return "system";
  }

  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  return isThemePreference(stored) ? stored : "system";
}

export function persistThemePreference(mode: ThemePreference): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(THEME_STORAGE_KEY, mode);
  applyThemePreference(mode);
  window.dispatchEvent(
    new CustomEvent("echoreadly-theme", { detail: mode }),
  );
}

export function applyReadingPreferences(input: {
  fontSize: string;
  readingWidth: string;
}): void {
  if (typeof document === "undefined") {
    return;
  }

  const root = document.documentElement;
  root.setAttribute("data-font-size", input.fontSize);
  root.setAttribute("data-reading-width", input.readingWidth);
}
