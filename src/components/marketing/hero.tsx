import { Container } from "@/components/layout";
import { siteConfig } from "@/config";

const primaryCtaClassName =
  "inline-flex h-11 items-center justify-center rounded-md bg-foreground px-5 text-sm font-medium text-background transition-opacity hover:opacity-90";

const secondaryCtaClassName =
  "inline-flex h-11 items-center justify-center rounded-md border border-border bg-surface px-5 text-sm font-medium text-foreground transition-colors hover:bg-surface-muted";

/**
 * Marketing hero: brand-forward copy on the left, abstract product frame on the right.
 * Anchors are placeholders — App Router routes are not wired yet.
 */
export function MarketingHero() {
  return (
    <section
      aria-labelledby="hero-brand"
      className="relative overflow-hidden scroll-mt-20"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgb(29_78_216_/_0.08),_transparent_55%),linear-gradient(to_bottom,_var(--background),_var(--surface-muted))]"
      />

      <Container className="relative grid items-center gap-12 py-20 sm:gap-14 sm:py-24 lg:grid-cols-2 lg:gap-16">
        <div className="max-w-xl">
          <p className="text-sm text-muted">
            <span
              aria-hidden="true"
              className="mr-2 inline-block size-1.5 rounded-full bg-accent align-middle"
            />
            Trusted by early readers for calm, focused study
          </p>

          <h1
            id="hero-brand"
            className="mt-6 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-[3.25rem] lg:leading-[1.1]"
          >
            {siteConfig.name}
          </h1>

          <p className="mt-4 text-2xl font-medium tracking-tight text-foreground sm:text-3xl sm:leading-snug">
            AI-powered reading that stays clear and quiet
          </p>

          <p className="mt-5 max-w-md text-base leading-relaxed text-muted sm:text-lg">
            Upload a document, get a precise summary, read with focus, and listen
            when you need to — all in one calm workspace.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <a href="#get-started" className={primaryCtaClassName}>
              Get Started
            </a>
            <a href="#watch-demo" className={secondaryCtaClassName}>
              Watch Demo
            </a>
          </div>
        </div>

        <HeroProductPlaceholder />
      </Container>
    </section>
  );
}

/**
 * Abstract reader chrome — structural placeholder only, no illustration assets.
 */
function HeroProductPlaceholder() {
  return (
    <div
      aria-hidden="true"
      className="w-full overflow-hidden rounded-lg border border-border bg-surface shadow-sm lg:justify-self-end"
    >
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <span className="size-2.5 rounded-full bg-border" />
        <span className="size-2.5 rounded-full bg-border" />
        <span className="size-2.5 rounded-full bg-border" />
        <span className="ml-3 h-2 w-28 rounded-sm bg-surface-muted" />
      </div>

      <div className="grid min-h-[18rem] grid-cols-[4.5rem_1fr] sm:min-h-[22rem] sm:grid-cols-[5.5rem_1fr]">
        <div className="space-y-3 border-r border-border bg-surface-muted/60 p-3 sm:p-4">
          <div className="h-2 w-full rounded-sm bg-border" />
          <div className="h-2 w-4/5 rounded-sm bg-border" />
          <div className="h-2 w-3/5 rounded-sm bg-border" />
          <div className="mt-6 h-2 w-full rounded-sm bg-border" />
          <div className="h-2 w-2/3 rounded-sm bg-border" />
        </div>

        <div className="flex flex-col gap-5 p-5 sm:p-6">
          <div className="space-y-2.5">
            <div className="h-2.5 w-2/5 rounded-sm bg-foreground/15" />
            <div className="h-2 w-full rounded-sm bg-border" />
            <div className="h-2 w-[92%] rounded-sm bg-border" />
            <div className="h-2 w-[88%] rounded-sm bg-border" />
            <div className="h-2 w-3/4 rounded-sm bg-border" />
          </div>

          <div className="space-y-2.5 border-l-2 border-accent/40 pl-4">
            <div className="h-2 w-1/4 rounded-sm bg-accent/35" />
            <div className="h-2 w-full rounded-sm bg-border" />
            <div className="h-2 w-[85%] rounded-sm bg-border" />
            <div className="h-2 w-[70%] rounded-sm bg-border" />
          </div>

          <div className="mt-auto space-y-2.5">
            <div className="h-2 w-full rounded-sm bg-border" />
            <div className="h-2 w-[90%] rounded-sm bg-border" />
            <div className="h-2 w-2/3 rounded-sm bg-border" />
          </div>
        </div>
      </div>
    </div>
  );
}
