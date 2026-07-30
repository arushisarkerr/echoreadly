"use client";

import { useEffect, useRef, useState } from "react";

import { ThemeIcon } from "./nav";

type ThemeMode = "light" | "dark" | "system";

const STORAGE_KEY = "echoreadly-theme";

function applyTheme(mode: ThemeMode) {
  const root = document.documentElement;
  if (mode === "system") {
    root.removeAttribute("data-theme");
    return;
  }
  root.setAttribute("data-theme", mode);
}

/**
 * Cycles light → dark → system. Client-only; no backend.
 */
export function ThemeToggle() {
  const [mode, setMode] = useState<ThemeMode>("system");
  const labelRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const initial: ThemeMode =
      stored === "light" || stored === "dark" || stored === "system"
        ? stored
        : "system";
    applyTheme(initial);
    const frame = requestAnimationFrame(() => {
      setMode(initial);
      if (labelRef.current) {
        labelRef.current.textContent = initial;
      }
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  function cycle() {
    const next: ThemeMode =
      mode === "light" ? "dark" : mode === "dark" ? "system" : "light";
    setMode(next);
    window.localStorage.setItem(STORAGE_KEY, next);
    applyTheme(next);
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
