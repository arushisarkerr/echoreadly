"use client";

import { MenuIcon } from "@/components/icons";
import { siteConfig } from "@/config";
import { AccountMenu } from "@/features/auth";

import { SearchIcon, ThemeIcon } from "./nav";

type DashboardHeaderProps = {
  onMenuClick: () => void;
};

/**
 * Dashboard top bar with search and authenticated account controls.
 */
export function DashboardHeader({ onMenuClick }: DashboardHeaderProps) {
  return (
    <header className="flex h-16 shrink-0 items-center gap-3 border-b border-border bg-background px-4 sm:px-6">
      <button
        type="button"
        className="inline-flex size-10 items-center justify-center rounded-md text-foreground transition-colors hover:bg-surface-muted lg:hidden"
        aria-label="Open sidebar"
        onClick={onMenuClick}
      >
        <MenuIcon className="size-5" />
      </button>

      <div className="hidden items-center gap-2.5 lg:flex">
        <span
          aria-hidden="true"
          className="flex size-7 items-center justify-center rounded-md bg-foreground text-[0.7rem] font-semibold tracking-tight text-background"
        >
          Er
        </span>
        <span className="text-sm font-semibold tracking-tight text-foreground">
          {siteConfig.name}
        </span>
      </div>

      <div className="mx-auto w-full max-w-md flex-1 lg:mx-8">
        <label className="relative block">
          <span className="sr-only">Search</span>
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle" />
          <input
            type="search"
            placeholder="Search your library…"
            disabled
            className="h-10 w-full rounded-md border border-border bg-surface pr-3 pl-9 text-sm text-foreground placeholder:text-subtle disabled:cursor-not-allowed disabled:opacity-80"
          />
        </label>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          className="inline-flex size-10 items-center justify-center rounded-md text-foreground transition-colors hover:bg-surface-muted"
          aria-label="Toggle theme (coming soon)"
          disabled
        >
          <ThemeIcon className="size-4" />
        </button>

        <AccountMenu />
      </div>
    </header>
  );
}
