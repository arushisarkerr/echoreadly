"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { siteConfig } from "@/config";
import { cn } from "@/utils";

import { DASHBOARD_NAV } from "./nav";

type DashboardSidebarProps = {
  onNavigate?: () => void;
};

/**
 * Application sidebar navigation for desktop and mobile drawer use.
 */
export function DashboardSidebar({ onNavigate }: DashboardSidebarProps) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col bg-surface">
      <div className="flex h-16 items-center gap-2.5 border-b border-border px-5">
        <Link
          href="/dashboard"
          aria-label={`${siteConfig.name} dashboard`}
          className="flex items-center gap-2.5 text-foreground no-underline"
          onClick={onNavigate}
        >
          <span
            aria-hidden="true"
            className="flex size-7 items-center justify-center rounded-md bg-foreground text-[0.7rem] font-semibold tracking-tight text-background"
          >
            Er
          </span>
          <span className="text-[0.95rem] font-semibold tracking-tight">
            {siteConfig.name}
          </span>
        </Link>
      </div>

      <nav aria-label="Dashboard" className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="list-none space-y-1 p-0">
          {DASHBOARD_NAV.map((item) => {
            const Icon = item.icon;
            const isActive = item.isHome
              ? pathname === "/dashboard"
              : pathname === item.href ||
                pathname.startsWith(`${item.href}/`);

            return (
              <li key={item.label}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors",
                    isActive
                      ? "bg-surface-muted font-medium text-foreground"
                      : "text-muted hover:bg-surface-muted hover:text-foreground",
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
