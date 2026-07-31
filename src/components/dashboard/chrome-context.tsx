"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

type DashboardChromeContextValue = {
  collapsed: boolean;
  setCollapsed: (value: boolean) => void;
  mobileOpen: boolean;
  setMobileOpen: (value: boolean) => void;
  commandOpen: boolean;
  setCommandOpen: (value: boolean) => void;
};

const DashboardChromeContext =
  createContext<DashboardChromeContextValue | null>(null);

const COLLAPSE_KEY = "echoreadly-sidebar-collapsed";
const COLLAPSE_EVENT = "echoreadly-sidebar-collapsed";

function subscribeCollapse(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(COLLAPSE_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(COLLAPSE_EVENT, onStoreChange);
  };
}

function getCollapseSnapshot() {
  return window.localStorage.getItem(COLLAPSE_KEY) === "1";
}

function getCollapseServerSnapshot() {
  return false;
}

export function DashboardChromeProvider({ children }: { children: ReactNode }) {
  const collapsed = useSyncExternalStore(
    subscribeCollapse,
    getCollapseSnapshot,
    getCollapseServerSnapshot,
  );
  const [mobileOpen, setMobileOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const key = event.key.toLowerCase();
      if ((event.metaKey || event.ctrlKey) && key === "k") {
        event.preventDefault();
        setCommandOpen((value) => !value);
      }
      if ((event.metaKey || event.ctrlKey) && key === "b") {
        event.preventDefault();
        const next = !getCollapseSnapshot();
        window.localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
        window.dispatchEvent(new Event(COLLAPSE_EVENT));
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const setCollapsed = useCallback((value: boolean) => {
    window.localStorage.setItem(COLLAPSE_KEY, value ? "1" : "0");
    window.dispatchEvent(new Event(COLLAPSE_EVENT));
  }, []);

  return (
    <DashboardChromeContext.Provider
      value={{
        collapsed,
        setCollapsed,
        mobileOpen,
        setMobileOpen,
        commandOpen,
        setCommandOpen,
      }}
    >
      {children}
    </DashboardChromeContext.Provider>
  );
}

export function useDashboardChrome() {
  const value = useContext(DashboardChromeContext);
  if (!value) {
    throw new Error("useDashboardChrome must be used within DashboardChromeProvider");
  }
  return value;
}
