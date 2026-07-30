"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";

import { CloseIcon } from "@/components/icons";
import { ROUTES } from "@/constants";
import { cn } from "@/utils";

import { CommandDock } from "./command-dock";
import { DashboardHeader } from "./header";
import { DashboardSidebar } from "./sidebar";

type DashboardShellProps = {
  children: ReactNode;
};

function titleForPath(pathname: string): string {
  if (pathname === ROUTES.dashboard) return "Home";
  if (pathname.startsWith(ROUTES.library)) return "Library";
  if (pathname.startsWith(ROUTES.addContent)) return "Add Content";
  if (pathname.startsWith(ROUTES.listen)) return "Listen";
  if (pathname.startsWith(ROUTES.collections)) return "Collections";
  if (pathname.startsWith(ROUTES.history)) return "History";
  if (pathname.startsWith(ROUTES.analytics)) return "Analytics";
  if (pathname.startsWith(ROUTES.jobs)) return "Jobs";
  if (pathname.startsWith(ROUTES.exports)) return "Exports";
  if (pathname.startsWith(ROUTES.voices)) return "Voice Library";
  if (pathname.startsWith(ROUTES.settings)) return "Settings";
  if (pathname.startsWith("/dashboard/reader")) return "Listening Studio";
  return "Workspace";
}

/**
 * Immersive studio shell — glass rail, floating header, command dock.
 */
export function DashboardShell({ children }: DashboardShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const hideDock = pathname.startsWith("/dashboard/reader");

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

  return (
    <div className="relative flex min-h-full flex-1 bg-background">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_8%_-10%,var(--glow),transparent_42%),radial-gradient(ellipse_at_92%_0%,color-mix(in_srgb,var(--accent-soft)_14%,transparent),transparent_38%),linear-gradient(180deg,var(--background),color-mix(in_srgb,var(--surface-muted)_35%,var(--background)))]"
      />

      <aside
        className="er-glass sticky top-0 z-20 hidden h-svh w-[16.5rem] shrink-0 border-r border-[color:var(--glass-border)] lg:block"
        aria-label="Sidebar"
      >
        <DashboardSidebar />
      </aside>

      <div
        className={cn(
          "fixed inset-0 z-40 bg-foreground/30 backdrop-blur-[2px] transition-opacity lg:hidden",
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        aria-hidden={!mobileOpen}
        onClick={() => setMobileOpen(false)}
      />

      <aside
        id="dashboard-mobile-sidebar"
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-[16.5rem] border-r border-border bg-surface transition-transform lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
        aria-hidden={!mobileOpen}
      >
        <div className="absolute top-3 right-3 z-10">
          <button
            type="button"
            className="inline-flex size-9 items-center justify-center rounded-xl text-foreground hover:bg-surface-muted"
            aria-label="Close sidebar"
            onClick={() => setMobileOpen(false)}
          >
            <CloseIcon className="size-4" />
          </button>
        </div>
        <DashboardSidebar onNavigate={() => setMobileOpen(false)} />
      </aside>

      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        <DashboardHeader
          onMenuClick={() => setMobileOpen(true)}
          title={titleForPath(pathname)}
        />
        <main
          className={cn(
            "flex min-h-0 flex-1 flex-col",
            hideDock ? "overflow-hidden" : "overflow-y-auto pb-28",
          )}
        >
          {children}
        </main>
      </div>

      {!hideDock ? <CommandDock /> : null}
    </div>
  );
}
