import { siteConfig } from "@/config";
import { ROUTES } from "@/constants";

const PRODUCT = [
  { label: "Sources", href: "#sources" },
  { label: "Voices", href: "#voices" },
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
] as const;

/**
 * Quiet footer — reduced visual weight.
 */
export function MarketingFooter() {
  const year = new Date().getFullYear();

  return (
    <footer id="about" className="border-t border-border">
      <div className="mx-auto flex max-w-7xl flex-col gap-10 px-5 py-14 sm:px-8 sm:py-16 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-sm">
          <a
            href={ROUTES.home}
            className="font-display text-sm font-semibold tracking-tight text-foreground no-underline"
          >
            {siteConfig.name}
          </a>
          <p className="mt-3 text-sm leading-relaxed text-subtle">
            {siteConfig.tagline}
          </p>
        </div>

        <nav aria-label="Footer">
          <ul className="flex list-none flex-wrap gap-x-6 gap-y-3 p-0">
            {PRODUCT.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="text-sm text-muted transition-colors hover:text-foreground"
                >
                  {link.label}
                </a>
              </li>
            ))}
            <li>
              <a
                href="#faq"
                className="text-sm text-muted transition-colors hover:text-foreground"
              >
                Contact
              </a>
            </li>
          </ul>
        </nav>
      </div>
      <div className="border-t border-border">
        <p
          className="mx-auto max-w-7xl px-5 py-6 text-xs text-subtle sm:px-8"
          suppressHydrationWarning
        >
          © {year} {siteConfig.name}
        </p>
      </div>
    </footer>
  );
}
