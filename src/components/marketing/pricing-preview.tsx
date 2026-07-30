import { ROUTES } from "@/constants";
import { Reveal } from "@/components/marketing/reveal";
import { cn } from "@/utils";

const PLANS = [
  {
    name: "Free",
    price: "$0",
    blurb: "Start converting content into natural audio.",
    features: [
      "Core imports",
      "Online listening",
      "Basic AI summary",
      "Limited voices",
    ],
    cta: "Start Free",
    href: ROUTES.signup,
    featured: false,
  },
  {
    name: "Pro",
    price: "Soon",
    blurb: "Premium voices, styles, exports, and depth.",
    features: [
      "Everything in Free",
      "Premium voices & styles",
      "MP3 · M4A · WAV",
      "AI chat & summaries",
      "Translation + sync",
    ],
    cta: "Start Pro",
    href: ROUTES.signup,
    featured: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    blurb: "Controls and scale for organizations.",
    features: [
      "Everything in Pro",
      "Team workspaces",
      "API access",
      "Custom integrations",
    ],
    cta: "Contact sales",
    href: "#contact",
    featured: false,
  },
] as const;

/**
 * Pricing — interaction cards only where choice happens.
 */
export function PricingPreview() {
  return (
    <section
      id="pricing"
      aria-labelledby="pricing-heading"
      className="scroll-mt-24 border-t border-border"
    >
      <div className="mx-auto max-w-7xl px-5 py-24 sm:px-8 sm:py-32">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 id="pricing-heading" className="er-display-lg text-foreground">
            Simple plans for serious listening.
          </h2>
          <p className="er-copy mx-auto mt-5 text-muted">
            Start free. Upgrade when your library — and your ears — ask for more.
          </p>
        </Reveal>

        <ul className="mt-16 grid list-none grid-cols-1 gap-5 p-0 lg:grid-cols-3">
          {PLANS.map((plan, i) => (
            <li key={plan.name}>
              <Reveal delayClassName={`er-reveal-delay-${Math.min(i + 1, 3)}`}>
                <div
                  className={cn(
                    "relative flex h-full flex-col rounded-[1.5rem] border p-7",
                    plan.featured
                      ? "border-foreground/20 bg-foreground text-background shadow-[var(--elevation-lg)]"
                      : "er-glass border-[color:var(--glass-border)]",
                  )}
                >
                  {plan.featured ? (
                    <span className="absolute -top-3 left-7 rounded-full bg-accent px-3 py-1 text-[0.65rem] font-bold tracking-[0.12em] text-accent-foreground uppercase">
                      Most popular
                    </span>
                  ) : null}
                  <h3 className="font-display text-xl font-bold tracking-tight">
                    {plan.name}
                  </h3>
                  <p
                    className={cn(
                      "mt-4 font-display text-4xl font-bold tracking-tight",
                      plan.featured ? "text-background" : "text-foreground",
                    )}
                  >
                    {plan.price}
                  </p>
                  <p
                    className={cn(
                      "er-copy-sm mt-3",
                      plan.featured ? "text-background/70" : "text-muted",
                    )}
                  >
                    {plan.blurb}
                  </p>
                  <ul className="mt-8 flex flex-1 list-none flex-col gap-3 p-0">
                    {plan.features.map((f) => (
                      <li
                        key={f}
                        className={cn(
                          "text-sm",
                          plan.featured ? "text-background/85" : "text-foreground",
                        )}
                      >
                        {f}
                      </li>
                    ))}
                  </ul>
                  <a
                    href={plan.href}
                    className={cn(
                      "er-btn mt-8 inline-flex h-11 items-center justify-center rounded-full px-5",
                      plan.featured
                        ? "bg-background text-foreground"
                        : "bg-foreground text-background",
                    )}
                  >
                    {plan.cta}
                  </a>
                </div>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
