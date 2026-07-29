"use client";

import { useEffect, useId, useState } from "react";

import { CloseIcon, MenuIcon } from "@/components/icons";
import { Container } from "@/components/layout";
import { siteConfig } from "@/config";
import { AccountMenu } from "@/features/auth";

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
] as const;

const linkClassName =
  "rounded-md px-3 py-2 text-sm text-muted transition-colors hover:text-foreground";

/**
 * Sticky marketing navigation with desktop links and a mobile disclosure menu.
 */
export function MarketingNavbar() {
  const [open, setOpen] = useState(false);
  const menuId = useId();

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
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  function closeMenu() {
    setOpen(false);
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border/80 bg-background/80 backdrop-blur-md">
      <Container>
        <div className="flex h-16 items-center justify-between gap-4">
          <a
            href="#"
            aria-label={`${siteConfig.name} home`}
            className="flex items-center gap-2.5 text-foreground no-underline"
            onClick={closeMenu}
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
          </a>

          <nav
            aria-label="Primary"
            className="hidden items-center gap-1 md:flex"
          >
            {NAV_LINKS.map((link) => (
              <a key={link.href} href={link.href} className={linkClassName}>
                {link.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            <AccountMenu />
          </div>

          <button
            type="button"
            className="inline-flex size-10 items-center justify-center rounded-md text-foreground transition-colors hover:bg-surface-muted md:hidden"
            aria-expanded={open}
            aria-controls={menuId}
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? (
              <CloseIcon className="size-5" />
            ) : (
              <MenuIcon className="size-5" />
            )}
          </button>
        </div>
      </Container>

      <div
        id={menuId}
        hidden={!open}
        className="border-t border-border bg-background md:hidden"
      >
        <Container>
          <nav aria-label="Mobile" className="flex flex-col gap-1 py-4">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-md px-3 py-3 text-base text-foreground transition-colors hover:bg-surface-muted"
                onClick={closeMenu}
              >
                {link.label}
              </a>
            ))}

            <div className="mt-3 border-t border-border pt-4">
              <AccountMenu />
            </div>
          </nav>
        </Container>
      </div>
    </header>
  );
}
