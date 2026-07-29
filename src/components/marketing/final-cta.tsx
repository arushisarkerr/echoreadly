import { Container } from "@/components/layout";
import { siteConfig } from "@/config";

const primaryCtaClassName =
  "inline-flex h-11 w-full items-center justify-center rounded-md bg-foreground px-5 text-sm font-medium text-background transition-opacity hover:opacity-90 sm:w-auto";

const secondaryCtaClassName =
  "inline-flex h-11 w-full items-center justify-center rounded-md border border-border bg-surface px-5 text-sm font-medium text-foreground transition-colors hover:bg-surface-muted sm:w-auto";

/**
 * Closing call-to-action for the marketing landing page.
 * Anchors are placeholders — App Router routes are not wired yet.
 */
export function FinalCta() {
  return (
    <section
      id="get-started"
      aria-labelledby="final-cta-heading"
      className="scroll-mt-20 border-t border-border bg-surface-muted/40"
    >
      <Container className="py-20 sm:py-24">
        <div className="relative overflow-hidden rounded-lg border border-border bg-surface px-6 py-14 text-center sm:px-10 sm:py-16">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgb(29_78_216_/_0.08),_transparent_60%)]"
          />

          <div className="relative mx-auto max-w-2xl">
            <h2
              id="final-cta-heading"
              className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl"
            >
              Start reading smarter with AI.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted sm:text-lg">
              Try {siteConfig.name} for focused reading, clear summaries, and
              natural speech — built for students, professionals, and lifelong
              learners.
            </p>

            <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
              <a href="#get-started" className={primaryCtaClassName}>
                Get Started
              </a>
              <a href="#watch-demo" className={secondaryCtaClassName}>
                Watch Demo
              </a>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
