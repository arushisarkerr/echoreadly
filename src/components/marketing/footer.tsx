import { Container } from "@/components/layout";
import { siteConfig } from "@/config";

const PRODUCT_LINKS = [
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
] as const;

const COMPANY_LINKS = [
  { label: "About", href: "#about" },
  { label: "Contact", href: "#contact" },
] as const;

const LEGAL_LINKS = [
  { label: "Privacy", href: "#privacy" },
  { label: "Terms", href: "#terms" },
] as const;

const SOCIAL_LINKS = [
  { label: "X", href: "#social-x" },
  { label: "LinkedIn", href: "#social-linkedin" },
  { label: "GitHub", href: "#social-github" },
] as const;

const footerLinkClassName =
  "text-sm text-muted transition-colors hover:text-foreground";

/**
 * Marketing footer with product, company, legal, and social placeholders.
 */
export function MarketingFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-background">
      <Container className="py-14 sm:py-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <a
              href="#"
              aria-label={`${siteConfig.name} home`}
              className="inline-flex items-center gap-2.5 text-foreground no-underline"
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
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted">
              {siteConfig.tagline}. A calm workspace for documents, summaries,
              and speech.
            </p>
          </div>

          <FooterColumn title="Product" links={PRODUCT_LINKS} />
          <FooterColumn title="Company" links={COMPANY_LINKS} />
          <FooterColumn title="Legal" links={LEGAL_LINKS} />
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-border pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted">
            © {year} {siteConfig.name}
          </p>

          <nav aria-label="Social">
            <ul className="flex list-none items-center gap-4 p-0">
              {SOCIAL_LINKS.map((link) => (
                <li key={link.label}>
                  <a href={link.href} className={footerLinkClassName}>
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </Container>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: readonly { label: string; href: string }[];
}) {
  return (
    <nav aria-label={title}>
      <h2 className="text-sm font-semibold tracking-tight text-foreground">
        {title}
      </h2>
      <ul className="mt-4 list-none space-y-3 p-0">
        {links.map((link) => (
          <li key={link.label}>
            <a href={link.href} className={footerLinkClassName}>
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
