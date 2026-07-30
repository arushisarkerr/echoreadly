import { Reveal } from "@/components/marketing/reveal";

/**
 * Visual story: files become listen-ready audio.
 */
export function MarketingTransform() {
  return (
    <section
      id="transform"
      aria-labelledby="transform-heading"
      className="relative overflow-hidden border-t border-border scroll-mt-24"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,_transparent,_color-mix(in_srgb,var(--accent)_6%,transparent)_40%,_transparent)]"
      />

      <div className="mx-auto max-w-7xl px-5 py-24 sm:px-8 sm:py-32">
        <Reveal>
          <p className="er-copy-sm font-medium tracking-[0.18em] text-accent uppercase">
            Source → audio
          </p>
          <h2 id="transform-heading" className="er-display-lg mt-4 max-w-[16ch] text-foreground">
            From what you bring to what you hear.
          </h2>
          <p className="er-copy mt-5 text-muted">
            EchoReadly converts PDF, DOCX, TXT, and Markdown into natural AI
            audio. Import, wait while it prepares, then listen.
          </p>
        </Reveal>

        <div className="relative mt-16 grid gap-6 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
          <Reveal delayClassName="er-reveal-delay-1">
            <ul className="space-y-4">
              {["PDF", "DOCX", "TXT", "Markdown"].map((label) => (
                <li
                  key={label}
                  className="er-glass rounded-2xl px-5 py-4 font-display text-lg font-semibold tracking-tight text-foreground"
                >
                  {label}
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal delayClassName="er-reveal-delay-2" className="flex justify-center py-6">
            <div className="relative flex h-28 w-28 items-center justify-center">
              <span
                aria-hidden="true"
                className="absolute inset-0 rounded-full border border-accent/30"
              />
              <span
                aria-hidden="true"
                className="absolute inset-3 rounded-full border border-dashed border-accent/40"
              />
              <span className="font-display text-sm font-bold tracking-tight text-accent">
                → audio
              </span>
            </div>
          </Reveal>

          <Reveal delayClassName="er-reveal-delay-3">
            <div className="er-glass overflow-hidden rounded-3xl p-6">
              <p className="text-xs font-semibold tracking-[0.16em] text-accent uppercase">
                Output
              </p>
              <p className="er-display-sm mt-3 text-foreground">
                Natural AI audio ready to listen — বাংলা first. Download MP3
                from Downloads after you listen.
              </p>
              <div className="mt-8 flex h-20 items-end gap-1.5">
                {[30, 55, 40, 75, 48, 82, 36, 68, 44, 70, 32, 60].map((h, i) => (
                  <span
                    key={i}
                    className="er-wave-bar flex-1 rounded-full bg-accent/80"
                    style={{
                      height: `${h}%`,
                      animationDelay: `${i * 0.08}s`,
                    }}
                  />
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
