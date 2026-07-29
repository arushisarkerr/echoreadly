import { Container } from "@/components/layout";
import { cn } from "@/utils";

type Plan = {
  name: string;
  description: string;
  features: string[];
  cta: string;
  href: string;
  popular?: boolean;
};

const PLANS: Plan[] = [
  {
    name: "Free",
    description: "Start reading smarter with essential tools.",
    features: [
      "Read PDFs",
      "Basic AI Summary",
      "Limited Text-to-Speech",
      "Community Support",
    ],
    cta: "Get Started",
    href: "#get-started",
  },
  {
    name: "Pro",
    description: "Unlimited power for focused readers and creators.",
    features: [
      "Everything in Free",
      "Unlimited AI Summaries",
      "Premium Voices",
      "OCR",
      "Translation",
      "Priority Processing",
      "Priority Support",
    ],
    cta: "Start Pro",
    href: "#get-started",
    popular: true,
  },
  {
    name: "Enterprise",
    description: "Advanced controls for teams and organizations.",
    features: [
      "Everything in Pro",
      "Team Workspace",
      "API Access",
      "Custom Integrations",
      "Dedicated Support",
    ],
    cta: "Contact Sales",
    href: "#get-started",
  },
];

const primaryCtaClassName =
  "mt-8 inline-flex h-11 w-full items-center justify-center rounded-md bg-foreground px-5 text-sm font-medium text-background transition-opacity hover:opacity-90";

const secondaryCtaClassName =
  "mt-8 inline-flex h-11 w-full items-center justify-center rounded-md border border-border bg-surface px-5 text-sm font-medium text-foreground transition-colors hover:bg-surface-muted";

/**
 * Pricing preview for the landing page.
 * Display-only plan cards — no billing or checkout logic.
 */
export function PricingPreview() {
  return (
    <section
      id="pricing"
      aria-labelledby="pricing-heading"
      className="scroll-mt-20 border-t border-border bg-background"
    >
      <Container className="py-20 sm:py-24">
        <header className="mx-auto max-w-2xl text-center">
          <h2
            id="pricing-heading"
            className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl"
          >
            Simple pricing for every reader
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted sm:text-lg">
            Start free, upgrade when you need more depth, and scale with your
            team when you are ready.
          </p>
        </header>

        <ul className="mt-12 grid list-none grid-cols-1 items-stretch gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
          {PLANS.map((plan) => (
            <li
              key={plan.name}
              className={cn(
                "relative flex flex-col rounded-lg border bg-surface p-6 transition-colors hover:border-foreground/15 hover:bg-background",
                plan.popular
                  ? "border-foreground/25 shadow-sm"
                  : "border-border",
              )}
            >
              {plan.popular ? (
                <span className="absolute -top-3 left-6 rounded-md border border-border bg-foreground px-2.5 py-1 text-xs font-medium tracking-wide text-background">
                  Most Popular
                </span>
              ) : null}

              <div className={cn(plan.popular && "pt-2")}>
                <h3 className="text-base font-semibold tracking-tight text-foreground">
                  {plan.name}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {plan.description}
                </p>
              </div>

              <ul className="mt-6 flex flex-1 list-none flex-col gap-3 p-0">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2.5 text-sm text-foreground"
                  >
                    <CheckIcon />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <a
                href={plan.href}
                className={
                  plan.popular ? primaryCtaClassName : secondaryCtaClassName
                }
              >
                {plan.cta}
              </a>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="mt-0.5 size-4 shrink-0 text-accent"
      aria-hidden="true"
    >
      <path d="M3.5 8.5l3 3 6-7" />
    </svg>
  );
}
