"use client";

import Link from "next/link";
import { useState } from "react";

import { useDashboardChrome } from "@/components/dashboard/chrome-context";
import { DASHBOARD_NAV } from "@/components/dashboard/nav-config";
import { IconSearch } from "@/components/icons/dashboard-icons";
import { Dialog } from "@/components/ui/overlays";
import { Input } from "@/components/ui/input";
import { ROUTES } from "@/constants";

const QUICK_ACTIONS = [
  { label: "Import content", href: ROUTES.import },
  { label: "Open library", href: ROUTES.library },
  { label: "Continue reading", href: ROUTES.reader },
  { label: "Continue listening", href: ROUTES.listen },
  { label: "Ask AI", href: ROUTES.ai },
  { label: "Export audio", href: ROUTES.export },
  { label: "Search history", href: ROUTES.history },
  { label: "Open settings", href: ROUTES.settings },
];

const NAV_ITEMS = DASHBOARD_NAV.flatMap((section) => section.items);

export function CommandPalette() {
  const { commandOpen, setCommandOpen } = useDashboardChrome();

  function close() {
    setCommandOpen(false);
  }

  return (
    <Dialog
      open={commandOpen}
      onClose={close}
      title="Command palette"
      description="Jump anywhere or start a common action."
      className="max-w-xl overflow-hidden p-0"
    >
      {commandOpen ? <CommandPaletteBody onClose={close} /> : null}
    </Dialog>
  );
}

function CommandPaletteBody({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState("");
  const normalized = query.trim().toLowerCase();
  const filteredNav = NAV_ITEMS.filter((item) =>
    item.label.toLowerCase().includes(normalized),
  );
  const filteredActions = QUICK_ACTIONS.filter((item) =>
    item.label.toLowerCase().includes(normalized),
  );

  return (
    <>
      <div className="-mt-2 border-b border-border px-4 pb-3">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Type a command or destination…"
          leftSlot={<IconSearch />}
          autoFocus
        />
      </div>
      <div className="max-h-80 overflow-y-auto p-2">
        <p className="px-2 py-1.5 text-[0.65rem] font-semibold tracking-[0.14em] text-subtle uppercase">
          Navigation
        </p>
        {filteredNav.length === 0 ? (
          <p className="px-3 py-2 text-sm text-muted">No destinations match.</p>
        ) : (
          filteredNav.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-foreground no-underline transition-colors hover:bg-surface-muted"
              >
                <Icon className="size-4 text-subtle" />
                {item.label}
              </Link>
            );
          })
        )}

        <p className="mt-3 px-2 py-1.5 text-[0.65rem] font-semibold tracking-[0.14em] text-subtle uppercase">
          Quick actions
        </p>
        {filteredActions.length === 0 ? (
          <p className="px-3 py-2 text-sm text-muted">No actions match.</p>
        ) : (
          filteredActions.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              onClick={onClose}
              className="flex items-center rounded-xl px-3 py-2.5 text-sm font-medium text-foreground no-underline transition-colors hover:bg-surface-muted"
            >
              {item.label}
            </Link>
          ))
        )}
      </div>
    </>
  );
}
