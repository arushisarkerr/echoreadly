import { Reveal } from "@/components/marketing/reveal";

const FORMATS = [
  {
    name: "MP3",
    line: "Coming soon",
    detail: "Planned for phones, cars, playlists, and everyday listening.",
  },
  {
    name: "M4A",
    line: "Coming soon",
    detail: "Planned for modern devices without sacrificing presence.",
  },
  {
    name: "WAV",
    line: "Coming soon",
    detail: "Planned for editing, archival, and production pipelines.",
  },
] as const;

/**
 * Audio export experience — timeline + formats as a product moment.
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
              Export experience · Coming soon
            </p>
            <h2 id="export-heading" className="er-display-lg mt-4 max-w-[14ch] text-foreground">
              Listen online today. File export is next.
            </h2>
            <p className="er-copy mt-5 text-muted">
              Stream PDF audio in the browser now. Downloadable MP3, M4A, and
              WAV exports are planned — not available yet.
            </p>

            <ul className="mt-10 list-none space-y-0 divide-y divide-border border-y border-border p-0">
              {FORMATS.map((format) => (
                <li key={format.name} className="grid gap-2 py-6 sm:grid-cols-[5rem_1fr]">
                  <span className="font-display text-2xl font-bold tracking-tight text-foreground">
                    {format.name}
                  </span>
                  <div>
                    <p className="er-display-sm text-foreground">{format.line}</p>
                    <p className="er-copy-sm mt-1 text-muted">{format.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal delayClassName="er-reveal-delay-2">
            <div className="relative mx-auto w-full max-w-md">
              <div className="er-glass rounded-[2rem] p-6 shadow-[var(--elevation-lg)]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold tracking-[0.14em] text-accent uppercase">
                    Export queue
                  </span>
                  <span className="text-xs text-subtle">Coming soon</span>
                </div>
                <div className="mt-8 space-y-4">
                  {["briefing.mp3", "chapter-03.m4a", "master.wav"].map(
                    (file, i) => (
                      <div
                        key={file}
                        className="flex items-center gap-3 rounded-2xl border border-border bg-surface/70 px-4 py-3"
                      >
                        <span
                          className="size-2.5 rounded-full bg-accent"
                          style={{ opacity: 1 - i * 0.2 }}
                        />
                        <span className="flex-1 font-mono text-sm text-foreground">
                          {file}
                        </span>
                        <span className="text-xs text-subtle">Planned</span>
                      </div>
                    ),
                  )}
                </div>
                <div className="mt-8 h-1.5 overflow-hidden rounded-full bg-foreground/10">
                  <div className="h-full w-[28%] rounded-full bg-accent" />
                </div>
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
