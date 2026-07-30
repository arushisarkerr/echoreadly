import { siteConfig } from "@/config";
import { ROUTES } from "@/constants";
import { Reveal } from "@/components/marketing/reveal";

/**
 * Final CTA — cinematic close into existing auth routes.
 */
export function FinalCta() {
  return (
    <section
      id="get-started"
      aria-labelledby="final-cta-heading"
      className="relative scroll-mt-24 overflow-hidden border-t border-border"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,_var(--glow),_transparent_55%),linear-gradient(180deg,_var(--surface-muted),_var(--background))]"
      />
      <div className="relative mx-auto max-w-5xl px-5 py-28 text-center sm:px-8 sm:py-36">
        <Reveal>
          <h2 id="final-cta-heading" className="er-display-xl text-foreground">
            Import. Listen.
          </h2>
          <p className="er-copy mx-auto mt-6 text-muted">
            Join {siteConfig.name} to turn files and links into natural AI
            audio. {siteConfig.tagline}
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href={ROUTES.signup}
              className="er-btn inline-flex h-12 items-center justify-center rounded-full bg-foreground px-8 text-background transition-transform hover:scale-[1.02]"
            >
              Start free — Import → Listen
            </a>
            <a
              href={ROUTES.login}
              className="er-btn inline-flex h-12 items-center justify-center rounded-full border border-border bg-[color:var(--glass)] px-8 text-foreground backdrop-blur-md"
            >
              Sign In
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
