"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  IconPanelLeft,
} from "@/components/icons/dashboard-icons";
import { DASHBOARD_NAV } from "@/components/dashboard/nav-config";
import { useDashboardChrome } from "@/components/dashboard/chrome-context";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/overlays";
import { ROUTES } from "@/constants";
import { siteConfig } from "@/config";
import { cn } from "@/utils";

function isActivePath(pathname: string, href: string) {
  if (href === ROUTES.dashboard) {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DashboardSidebar({
  onNavigate,
  className,
}: {
  onNavigate?: () => void;
  className?: string;
}) {
  const pathname = usePathname();
  const { collapsed, setCollapsed } = useDashboardChrome();
  const compact = collapsed && !onNavigate;

  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r border-border/80 bg-[color-mix(in_srgb,var(--surface)_88%,transparent)] backdrop-blur-xl",
        className,
      )}
    >
      <div
        className={cn(
          "flex h-14 items-center gap-2 border-b border-border/70 px-3",
          compact && "justify-center",
        )}
      >
        <Link
          href={ROUTES.dashboard}
          onClick={onNavigate}
          className={cn(
            "inline-flex min-w-0 items-center gap-2.5 rounded-xl px-1.5 py-1 text-foreground no-underline transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            compact && "justify-center px-0",
          )}
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-foreground text-[0.7rem] font-bold text-background">
            Er
          </span>
          {!compact ? (
            <span className="truncate font-display text-sm font-semibold tracking-tight">
              {siteConfig.name}
            </span>
          ) : null}
        </Link>
        {!compact && !onNavigate ? (
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto size-8"
            aria-label="Collapse sidebar"
            onClick={() => setCollapsed(true)}
          >
            <IconPanelLeft />
          </Button>
        ) : null}
      </div>

      <nav
        aria-label="Dashboard"
        className="flex-1 space-y-5 overflow-y-auto px-2 py-4"
      >
        {DASHBOARD_NAV.map((section) => (
          <div key={section.id} className="space-y-1">
            {section.label && !compact ? (
              <p className="px-2.5 pb-1 text-[0.65rem] font-semibold tracking-[0.16em] text-subtle uppercase">
                {section.label}
              </p>
            ) : null}
            {compact && section.label ? (
              <div className="mx-auto my-2 h-px w-6 bg-border" aria-hidden="true" />
            ) : null}
            {section.items.map((item) => {
              const active = isActivePath(pathname, item.href);
              const Icon = item.icon;
              const link = (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    compact && "justify-center px-0",
                    active
                      ? "bg-foreground text-background"
                      : "text-muted hover:bg-surface-muted hover:text-foreground",
                  )}
                >
                  <Icon
                    className={cn(
                      "size-4",
                      active ? "text-background" : "text-subtle group-hover:text-foreground",
                    )}
                  />
                  {!compact ? <span className="truncate">{item.label}</span> : null}
                </Link>
              );

              return compact ? (
                <Tooltip key={item.href} label={item.label}>
                  {link}
                </Tooltip>
              ) : (
                link
              );
            })}
          </div>
        ))}
      </nav>

      {compact ? (
        <div className="border-t border-border/70 p-2">
          <Tooltip label="Expand sidebar">
            <Button
              variant="ghost"
              size="icon"
              className="w-full"
              aria-label="Expand sidebar"
              onClick={() => setCollapsed(false)}
            >
              <IconPanelLeft />
            </Button>
          </Tooltip>
        </div>
      ) : (
        <div className="border-t border-border/70 p-3">
          <p className="px-1 text-[0.65rem] leading-relaxed text-subtle">
            Press{" "}
            <kbd className="rounded border border-border bg-surface-muted px-1.5 py-0.5 font-mono text-[0.6rem] text-foreground">
              ⌘K
            </kbd>{" "}
            for quick actions.
          </p>
        </div>
      )}
    </aside>
  );
}
