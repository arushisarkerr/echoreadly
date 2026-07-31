"use client";

import type { ReactNode } from "react";

import { useDashboardChrome } from "@/components/dashboard/chrome-context";
import { CommandPalette } from "@/components/dashboard/command-palette";
import { DashboardHeader } from "@/components/dashboard/header";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { Drawer } from "@/components/ui/overlays";
import { ToastRegion } from "@/components/ui/toast";
import { cn } from "@/utils";

export function DashboardShell({ children }: { children: ReactNode }) {
  const { collapsed, mobileOpen, setMobileOpen } = useDashboardChrome();

  return (
    <div className="min-h-full bg-[radial-gradient(ellipse_at_top,_color-mix(in_srgb,var(--glow)_55%,transparent),_transparent_42%),linear-gradient(180deg,_var(--background),_color-mix(in_srgb,var(--surface-muted)_35%,var(--background)))]">
      <div
        className={cn(
          "mx-auto grid min-h-full w-full max-w-[100rem] grid-cols-1",
          collapsed
            ? "lg:grid-cols-[4.5rem_minmax(0,1fr)]"
            : "lg:grid-cols-[16.5rem_minmax(0,1fr)]",
        )}
      >
        <div className="sticky top-0 hidden h-svh lg:block">
          <DashboardSidebar />
        </div>

        <div className="flex min-w-0 flex-col">
          <DashboardHeader />
          <main className="flex-1 px-3 py-5 sm:px-5 sm:py-6 lg:px-8">
            {children}
          </main>
        </div>
      </div>

      <Drawer
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        title="Navigation"
      >
        <DashboardSidebar onNavigate={() => setMobileOpen(false)} />
      </Drawer>

      <CommandPalette />
      <ToastRegion />
    </div>
  );
}
