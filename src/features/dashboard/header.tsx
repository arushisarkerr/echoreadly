"use client";

import Link from "next/link";

import { MenuIcon } from "@/components/icons";
import { ROUTES } from "@/constants";

import { SearchIcon } from "./nav";

type DashboardHeaderProps = {
  onMenuClick: () => void;
  title?: string;
};

/**
 * Floating workspace header — editorial title + library search jump.
 */
export function DashboardHeader({
  onMenuClick,
  title = "Workspace",
}: DashboardHeaderProps) {
  return (
    <header className="sticky top-0 z-30 px-3 pt-3 sm:px-5">
      <div className="er-glass mx-auto flex h-14 max-w-[96rem] items-center gap-3 rounded-2xl border border-[color:var(--glass-border)] px-3 shadow-[var(--elevation-sm)] sm:h-16 sm:px-4">
        <button
          type="button"
          className="inline-flex size-10 items-center justify-center rounded-xl text-foreground transition-colors hover:bg-surface-muted lg:hidden"
          aria-label="Open sidebar"
          onClick={onMenuClick}
        >
          <MenuIcon className="size-5" />
        </button>

        <div className="min-w-0 pl-1">
          <p className="truncate font-display text-[0.95rem] font-semibold tracking-tight text-foreground sm:text-base">
            {title}
          </p>
        </div>

        <Link
          href={ROUTES.library}
          className="relative mx-auto hidden h-10 min-w-0 flex-1 items-center rounded-full border border-border/70 bg-background/50 pr-3 pl-9 text-sm text-muted transition-colors hover:border-foreground/20 hover:text-foreground md:flex md:max-w-md"
        >
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle" />
          Search Library…
        </Link>

        <Link
          href={ROUTES.addContent}
          className="ml-auto inline-flex h-9 shrink-0 items-center justify-center rounded-full bg-foreground px-3.5 text-xs font-semibold text-background transition-opacity hover:opacity-90 sm:px-4"
        >
          Import
        </Link>
      </div>
    </header>
  );
}
