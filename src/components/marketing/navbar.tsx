"use client";

import { useEffect, useId, useState } from "react";

import { CloseIcon, MenuIcon } from "@/components/icons";
import { siteConfig } from "@/config";
import { ROUTES } from "@/constants";

const NAV_LINKS = [
  { label: "Sources", href: "#sources" },
  { label: "Voices", href: "#voices" },
  { label: "Features", href: "#features" },
  { label: "FAQ", href: "#faq" },
] as const;

/**
 * Floating glass navbar for the public landing page.
 */
export function MarketingNavbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menuId = useId();

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 24);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    const boot = window.setTimeout(onScroll, 0);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.clearTimeout(boot);
    };
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-50 px-4 pt-4 sm:px-6">
      <div
        className={`pointer-events-auto mx-auto flex max-w-6xl items-center justify-between gap-4 rounded-2xl px-4 py-3 transition-[background,box-shadow,border-color] duration-300 ${
          scrolled || open
            ? "er-glass border border-[color:var(--glass-border)]"
            : "border border-transparent bg-transparent"
        }`}
      >
        <a
          href={ROUTES.home}
          className="font-display inline-flex items-center gap-2.5 text-[0.95rem] font-semibold tracking-tight text-foreground no-underline"
          onClick={() => setOpen(false)}
        >
          <span
            aria-hidden="true"
            className="flex size-8 items-center justify-center rounded-xl bg-foreground text-[0.7rem] font-bold text-background"
          >
            Er
          </span>
          {siteConfig.name}
        </a>

        <nav aria-label="Primary" className="hidden items-center gap-1 lg:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <a
          href={ROUTES.dashboard}
          className="hidden h-9 items-center justify-center rounded-md bg-foreground px-3.5 text-sm font-medium text-background transition-opacity hover:opacity-90 md:inline-flex"
        >
          Open app
        </a>

        <button
          type="button"
          className="inline-flex size-10 items-center justify-center rounded-xl text-foreground md:hidden"
          aria-expanded={open}
          aria-controls={menuId}
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <CloseIcon className="size-5" /> : <MenuIcon className="size-5" />}
        </button>
      </div>

      <div
        id={menuId}
        hidden={!open}
        className="pointer-events-auto mx-auto mt-2 max-w-6xl overflow-hidden rounded-2xl er-glass border border-[color:var(--glass-border)] md:hidden"
      >
        <nav aria-label="Mobile" className="flex flex-col gap-1 p-3">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-xl px-3 py-3 text-base font-medium text-foreground"
              onClick={() => setOpen(false)}
            >
              {link.label}
            </a>
          ))}
          <a
            href={ROUTES.dashboard}
            className="mt-2 inline-flex h-11 items-center justify-center rounded-xl bg-foreground px-4 text-sm font-medium text-background"
            onClick={() => setOpen(false)}
          >
            Open app
          </a>
        </nav>
      </div>
    </header>
  );
}
