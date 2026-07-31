"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useDashboardChrome } from "@/components/dashboard/chrome-context";
import { DASHBOARD_PAGE_META } from "@/components/dashboard/nav-config";
import { ThemeToggle } from "@/components/dashboard/theme-toggle";
import {
  IconBell,
  IconCommand,
  IconMenu,
  IconPlus,
  IconSearch,
  IconUser,
} from "@/components/icons/dashboard-icons";
import { Breadcrumbs } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/overlays";
import { ROUTES } from "@/constants";

export function DashboardHeader() {
  const pathname = usePathname();
  const meta =
    DASHBOARD_PAGE_META[pathname] ?? DASHBOARD_PAGE_META[ROUTES.dashboard];
  const { setMobileOpen, setCommandOpen } = useDashboardChrome();

  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-[color-mix(in_srgb,var(--background)_82%,transparent)] backdrop-blur-xl">
      <div className="flex h-14 items-center gap-2 px-3 sm:gap-3 sm:px-5">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          aria-label="Open navigation"
          onClick={() => setMobileOpen(true)}
        >
          <IconMenu />
        </Button>

        <div className="min-w-0 flex-1">
          <Breadcrumbs
            items={meta.crumbs.map((label, index) => ({
              label,
              href: index === 0 ? ROUTES.dashboard : undefined,
            }))}
          />
          <p className="truncate text-sm font-semibold tracking-tight text-foreground">
            {meta.title}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setCommandOpen(true)}
          className="hidden h-10 min-w-48 items-center gap-2 rounded-xl border border-border bg-surface px-3 text-left text-sm text-subtle transition-colors hover:bg-surface-muted md:inline-flex"
        >
          <IconSearch className="size-4" />
          <span className="flex-1">Search workspace…</span>
          <span className="inline-flex items-center gap-1 rounded-md border border-border px-1.5 py-0.5 text-[0.65rem] text-subtle">
            <IconCommand className="size-3" />K
          </span>
        </button>

        <Link
          href={ROUTES.import}
          className="hidden h-9 items-center justify-center gap-1.5 rounded-lg bg-foreground px-3 text-xs font-semibold text-background transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:inline-flex"
        >
          <IconPlus className="size-3.5" />
          Import
        </Link>

        <Link
          href={ROUTES.import}
          className="inline-flex size-10 items-center justify-center rounded-xl bg-foreground text-background sm:hidden"
          aria-label="Quick import"
        >
          <IconPlus />
        </Link>

        <ThemeToggle />

        <Tooltip label="Notifications">
          <Button variant="ghost" size="icon" aria-label="Notifications">
            <IconBell />
          </Button>
        </Tooltip>

        <Tooltip label="Profile">
          <Button variant="ghost" size="icon" aria-label="Profile">
            <IconUser />
          </Button>
        </Tooltip>
      </div>
    </header>
  );
}
