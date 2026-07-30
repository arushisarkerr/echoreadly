"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { siteConfig } from "@/config";
import { ROUTES } from "@/constants";
import { AccountMenu } from "@/features/auth";
import { cn } from "@/utils";

import { DASHBOARD_NAV } from "./nav";
import { ThemeToggle } from "./theme-toggle";

type DashboardSidebarProps = {
  onNavigate?: () => void;
};

/**
 * Studio rail — vertical brand, sparse nav, account preserved at base.
 */
export function DashboardSidebar({ onNavigate }: DashboardSidebarProps) {
  const pathname = usePathname();

  return (
    <div className="relative flex h-full flex-col overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,color-mix(in_srgb,var(--accent)_10%,transparent),transparent_35%),var(--surface)]"
      />

      <div className="relative px-5 pt-6 pb-5">
        <Link
          href={ROUTES.dashboard}
          onClick={onNavigate}
          aria-label={`${siteConfig.name} home`}
          className="group block no-underline"
        >
          <span className="flex size-11 items-center justify-center rounded-2xl bg-foreground font-display text-sm font-bold tracking-tight text-background transition-transform group-hover:scale-[1.03]">
            Er
          </span>
          <span className="mt-4 block font-display text-lg font-semibold tracking-tight text-foreground">
            {siteConfig.name}
          </span>
          <span className="mt-1 block text-[0.65rem] font-semibold tracking-[0.22em] text-accent uppercase">
            Studio
          </span>
        </Link>
      </div>

      <nav
        aria-label="Workspace"
        className="relative flex-1 overflow-y-auto px-3 pb-4"
      >
        <ul className="list-none space-y-0.5 p-0">
          {DASHBOARD_NAV.map((item) => {
            const Icon = item.icon;
            const isActive = item.isHome
              ? pathname === ROUTES.dashboard
              : pathname === item.href ||
                pathname.startsWith(`${item.href}/`);

            return (
              <li key={item.label}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-[0.8125rem] transition-all",
                    isActive
                      ? "bg-foreground font-semibold text-background shadow-[var(--elevation-sm)]"
                      : "font-medium text-muted hover:bg-[color-mix(in_srgb,var(--foreground)_6%,transparent)] hover:text-foreground",
                  )}
                >
                  <Icon className="size-[1.05rem] shrink-0 opacity-90" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="relative space-y-2 border-t border-border/60 p-3">
        <ThemeToggle />
        <div className="rounded-2xl border border-border/60 bg-background/40 p-2 backdrop-blur-md">
          <AccountMenu />
        </div>
        <button
          type="button"
          disabled
          aria-label="Workspace switcher (coming soon)"
          className="flex h-10 w-full items-center justify-between rounded-2xl border border-dashed border-border/80 px-3 text-left text-[0.7rem] font-medium tracking-wide text-subtle"
        >
          <span>Personal</span>
          <span aria-hidden="true">···</span>
        </button>
      </div>
    </div>
  );
}
