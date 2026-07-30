import { Reveal } from "@/components/marketing/reveal";

/**
 * Audio downloads — MP3 only, as implemented.
 */
export function MarketingAudioExport() {
  return (
    <section
      id="export"
      aria-labelledby="export-heading"
      className="scroll-mt-24 overflow-hidden border-t border-border"
    >
      <div className="mx-auto max-w-7xl px-5 py-24 sm:px-8 sm:py-32">
        <div className="grid gap-14 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <Reveal>
            <p className="er-copy-sm font-medium tracking-[0.18em] text-accent uppercase">
              Take audio with you
            </p>
            <h2 id="export-heading" className="er-display-lg mt-4 max-w-[14ch] text-foreground">
              Listen now. Download when ready.
            </h2>
            <p className="er-copy mt-5 text-muted">
              Stream natural AI audio in the browser, then download prepared MP3
              files from Downloads.
            </p>

            <ul className="mt-10 list-none space-y-0 divide-y divide-border border-y border-border p-0">
              <li className="grid gap-2 py-6 sm:grid-cols-[5rem_1fr]">
                <span className="font-display text-2xl font-bold tracking-tight text-foreground">
                  MP3
                </span>
                <div>
                  <p className="er-display-sm text-foreground">Download ready</p>
                  <p className="er-copy-sm mt-1 text-muted">
                    Export page or summary narration, then reopen it anytime from
                    Downloads.
                  </p>
                </div>
              </li>
            </ul>
          </Reveal>

          <Reveal delayClassName="er-reveal-delay-2">
            <div className="relative mx-auto w-full max-w-md">
              <div className="er-glass rounded-[2rem] p-6 shadow-[var(--elevation-lg)]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold tracking-[0.14em] text-accent uppercase">
                    Downloads
                  </span>
                  <span className="text-xs text-subtle">MP3</span>
                </div>
                <p className="mt-8 text-sm leading-relaxed text-muted">
                  Your exported MP3 files appear here after you listen and
                  download from the reader.
                </p>
              </div>
              <div
                aria-hidden="true"
                className="er-pulse-glow absolute -inset-8 -z-10 rounded-full bg-[color:var(--glow)] blur-3xl"
              />
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
