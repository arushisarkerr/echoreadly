"use client";

import { useEffect, useRef, useState } from "react";

import {
  persistThemePreference,
  readStoredThemePreference,
  type ThemePreference,
} from "@/features/settings";

import { ThemeIcon } from "./nav";

/**
 * Cycles light → dark → system. Syncs local storage; account Settings is source of truth when loaded.
 */
export function ThemeToggle() {
  const [mode, setMode] = useState<ThemePreference>("system");
  const labelRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const initial = readStoredThemePreference();
    persistThemePreference(initial);
    const frame = requestAnimationFrame(() => {
      setMode(initial);
      if (labelRef.current) {
        labelRef.current.textContent = initial;
      }
    });

    function onThemeEvent(event: Event) {
      const detail = (event as CustomEvent<ThemePreference>).detail;
      if (detail === "light" || detail === "dark" || detail === "system") {
        setMode(detail);
        if (labelRef.current) {
          labelRef.current.textContent = detail;
        }
      }
    }

    window.addEventListener("echoreadly-theme", onThemeEvent);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("echoreadly-theme", onThemeEvent);
    };
  }, []);

  function cycle() {
    const next: ThemePreference =
      mode === "light" ? "dark" : mode === "dark" ? "system" : "light";
    setMode(next);
    persistThemePreference(next);
  }

  const label =
    mode === "light"
      ? "Theme: light. Switch to dark."
      : mode === "dark"
        ? "Theme: dark. Switch to system."
        : "Theme: system. Switch to light.";

  return (
    <button
      type="button"
      onClick={cycle}
      className="inline-flex h-10 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium text-muted transition-colors hover:bg-surface-muted hover:text-foreground"
      aria-label={label}
      title={label}
    >
      <ThemeIcon className="size-4 shrink-0" />
      <span ref={labelRef} className="capitalize">
        {mode}
      </span>
    </button>
  );
}
