"use client";

import { useCallback, useLayoutEffect, useSyncExternalStore } from "react";

import { IconMoon, IconSun } from "@/components/icons/dashboard-icons";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/overlays";

type ThemeMode = "light" | "dark";

const THEME_KEY = "echoreadly-theme";
const THEME_EVENT = "echoreadly-theme";

function subscribeTheme(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(THEME_EVENT, onStoreChange);
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(THEME_EVENT, onStoreChange);
    media.removeEventListener("change", onStoreChange);
  };
}

function resolveTheme(): ThemeMode {
  const stored = window.localStorage.getItem(THEME_KEY);
  if (stored === "light" || stored === "dark") {
    return stored;
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function getThemeServerSnapshot(): ThemeMode {
  return "light";
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(
    subscribeTheme,
    resolveTheme,
    getThemeServerSnapshot,
  );

  useLayoutEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const toggle = useCallback(() => {
    const next: ThemeMode = theme === "dark" ? "light" : "dark";
    window.localStorage.setItem(THEME_KEY, next);
    window.dispatchEvent(new Event(THEME_EVENT));
  }, [theme]);

  return (
    <Tooltip label={theme === "dark" ? "Switch to light" : "Switch to dark"}>
      <Button
        variant="ghost"
        size="icon"
        aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        onClick={toggle}
      >
        {theme === "dark" ? <IconSun /> : <IconMoon />}
      </Button>
    </Tooltip>
  );
}
