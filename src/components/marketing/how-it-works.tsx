import { Reveal } from "@/components/marketing/reveal";

const STEPS = [
  {
    n: "01",
    title: "Import",
    copy: "Drop a file to import (PDF, DOCX, TXT, or Markdown). Link import is coming soon.",
  },
  {
    n: "02",
    title: "Preparing",
    copy: "We process your content and show status while natural AI audio gets ready to play.",
  },
  {
    n: "03",
    title: "Listen",
    copy: "Press play when it’s ready. Hear your content in natural AI audio — বাংলা first.",
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
          <h2 id="how-heading" className="er-display-lg max-w-[14ch] text-foreground">
            Import. Preparing. Listen.
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
