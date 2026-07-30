import { Reveal } from "@/components/marketing/reveal";

const AVAILABLE = ["PDF", "DOCX", "TXT", "Markdown"] as const;

/**
 * Supported import formats — only what actually works.
 */
export function MarketingSources() {
  const availableLoop = [...AVAILABLE, ...AVAILABLE, ...AVAILABLE, ...AVAILABLE];

  return (
    <section
      id="sources"
      aria-labelledby="sources-heading"
      className="scroll-mt-24 overflow-hidden border-t border-border py-24 sm:py-28"
    >
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <Reveal>
          <h2 id="sources-heading" className="er-display-lg max-w-[16ch] text-foreground">
            Import the files you already have.
          </h2>
          <p className="er-copy mt-5 text-muted">
            PDF, DOCX, TXT, and Markdown — drop a file and EchoReadly prepares
            natural AI audio.
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
              {source}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
