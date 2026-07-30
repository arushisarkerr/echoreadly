import { Reveal } from "@/components/marketing/reveal";

const AVAILABLE = ["PDF file"] as const;

const COMING_SOON = [
  "DOC / DOCX",
  "TXT",
  "Markdown",
  "EPUB",
  "Website URL",
  "Blog",
  "News",
  "Documentation",
  "Audio File",
  "Video File",
  "YouTube Link",
] as const;

/**
 * Supported sources — dual-direction marquees, not a static chip grid.
 */
export function MarketingSources() {
  const availableLoop = [...AVAILABLE, ...AVAILABLE, ...AVAILABLE, ...AVAILABLE];
  const comingLoop = [...COMING_SOON, ...COMING_SOON];

  return (
    <section
      id="sources"
      aria-labelledby="sources-heading"
      className="scroll-mt-24 overflow-hidden border-t border-border py-24 sm:py-28"
    >
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <Reveal>
          <h2 id="sources-heading" className="er-display-lg max-w-[16ch] text-foreground">
            Files are live. Links are coming.
          </h2>
          <p className="er-copy mt-5 text-muted">
            Import files today (starting with PDF). Website URLs and other link
            sources are coming soon.
          </p>
        </Reveal>
      </div>

      <div className="relative mt-14 space-y-4">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-background to-transparent sm:w-28"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-background to-transparent sm:w-28"
        />

        <ul
          className="er-marquee-track flex w-max list-none gap-3 p-0"
          aria-label="Available import sources"
        >
          {availableLoop.map((source, i) => (
            <li
              key={`a-${source}-${i}`}
              className="er-glass shrink-0 rounded-full px-5 py-3 font-display text-sm font-semibold tracking-tight text-foreground"
            >
              {source} · Available
            </li>
          ))}
        </ul>

        <ul
          className="er-marquee-track flex w-max list-none gap-3 p-0 [animation-direction:reverse] [animation-duration:48s]"
          aria-label="Coming soon import sources"
        >
          {comingLoop.map((source, i) => (
            <li
              key={`b-${source}-${i}`}
              className="shrink-0 rounded-full border border-border bg-surface px-5 py-3 font-display text-sm font-semibold tracking-tight text-muted"
            >
              {source} · Coming soon
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
