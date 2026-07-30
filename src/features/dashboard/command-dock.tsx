"use client";

import Link from "next/link";

import { ROUTES } from "@/constants";

/**
 * Floating command orb — quick studio jumps.
 */
export function CommandDock() {
  const items = [
    { href: ROUTES.addContent, label: "Import" },
    { href: ROUTES.listen, label: "Listen" },
    { href: ROUTES.library, label: "Shelf" },
    { href: ROUTES.voices, label: "Voices" },
    { href: ROUTES.exports, label: "Export" },
  ] as const;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-4 sm:bottom-6">
      <nav
        aria-label="Quick actions"
        className="pointer-events-auto er-glass flex max-w-full items-center gap-0.5 overflow-x-auto rounded-full border border-[color:var(--glass-border)] p-1.5 shadow-[var(--elevation-md)]"
      >
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="shrink-0 rounded-full px-3.5 py-2 text-[0.7rem] font-semibold tracking-tight text-foreground transition-colors hover:bg-foreground hover:text-background sm:px-4 sm:text-xs"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
