import { Reveal } from "@/components/marketing/reveal";

const STEPS = [
  {
    n: "01",
    title: "Bring anything in",
    copy: "Drop a file, paste a URL, or link media. EchoReadly prepares the source for conversion.",
  },
  {
    n: "02",
    title: "Shape the voice",
    copy: "Pick a persona, language, and style — from calm teaching to documentary narration.",
  },
  {
    n: "03",
    title: "Listen or take it with you",
    copy: "Stream instantly, download, and export MP3, M4A, or WAV for any workflow.",
  },
] as const;

/**
 * How it works — editorial horizontal steps, not a card grid.
 */
export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      aria-labelledby="how-heading"
      className="scroll-mt-24 border-t border-border bg-[color-mix(in_srgb,var(--surface-muted)_55%,var(--background))]"
    >
      <div className="mx-auto max-w-7xl px-5 py-24 sm:px-8 sm:py-32">
        <Reveal>
          <h2 id="how-heading" className="er-display-lg max-w-[12ch] text-foreground">
            Three moves. Infinite listening.
          </h2>
        </Reveal>

        <ol className="mt-16 list-none space-y-0 p-0">
          {STEPS.map((step, index) => (
            <li key={step.n} className="border-t border-border py-10 last:border-b">
              <Reveal delayClassName={`er-reveal-delay-${Math.min(index + 1, 3)}`}>
                <div className="grid gap-6 md:grid-cols-[6rem_1fr_1.2fr] md:items-end">
                  <span className="font-mono text-sm tracking-[0.2em] text-accent">
                    {step.n}
                  </span>
                  <h3 className="er-display-md text-foreground">{step.title}</h3>
                  <p className="er-copy text-muted md:justify-self-end">{step.copy}</p>
                </div>
              </Reveal>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
