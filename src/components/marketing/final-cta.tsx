import { siteConfig } from "@/config";
import { ROUTES } from "@/constants";
import { Reveal } from "@/components/marketing/reveal";

/**
 * Final CTA — close into the public app shell.
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
            Open {siteConfig.name} and turn your files into natural AI audio.{" "}
            {siteConfig.tagline}
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href={ROUTES.dashboard}
              className="er-btn inline-flex h-12 items-center justify-center rounded-full bg-foreground px-8 text-background transition-transform hover:scale-[1.02]"
            >
              Open app
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
