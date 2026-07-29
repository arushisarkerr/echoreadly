"use client";

import { useEffect, useState, type ReactNode } from "react";

import { CloseIcon } from "@/components/icons";
import { cn } from "@/utils";

import { DashboardHeader } from "./header";
import { DashboardSidebar } from "./sidebar";

type DashboardShellProps = {
  children: ReactNode;
};

/**
 * Responsive dashboard chrome: fixed sidebar on desktop, drawer on mobile.
 */
export function DashboardShell({ children }: DashboardShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!mobileOpen) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMobileOpen(false);
      }
    }

    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  function closeMobile() {
    setMobileOpen(false);
  }

  return (
    <div className="flex min-h-full flex-1 bg-background">
      <aside
        className="sticky top-0 hidden h-svh w-64 shrink-0 border-r border-border lg:block"
        aria-label="Sidebar"
      >
        <DashboardSidebar />
      </aside>

      <div
        className={cn(
          "fixed inset-0 z-40 bg-foreground/20 transition-opacity lg:hidden",
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        aria-hidden={!mobileOpen}
        onClick={closeMobile}
      />

      <aside
        id="dashboard-mobile-sidebar"
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 border-r border-border transition-transform lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
        aria-hidden={!mobileOpen}
      >
        <div className="absolute top-3 right-3 z-10">
          <button
            type="button"
            className="inline-flex size-9 items-center justify-center rounded-md text-foreground transition-colors hover:bg-surface-muted"
            aria-label="Close sidebar"
            onClick={closeMobile}
          >
            <CloseIcon className="size-4" />
          </button>
        </div>
        <DashboardSidebar onNavigate={closeMobile} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardHeader onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
