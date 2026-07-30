import { Reveal } from "@/components/marketing/reveal";

const COMING = [
  "Google Docs",
  "Notion",
  "Google Drive",
  "Dropbox",
  "OneDrive",
] as const;

/**
 * Future integrations — roadmap constellation.
 */
export function MarketingIntegrations() {
  return (
    <section
      id="integrations"
      aria-labelledby="integrations-heading"
      className="scroll-mt-24 border-t border-border bg-[color-mix(in_srgb,var(--ink-deep)_3%,var(--background))]"
    >
      <div className="mx-auto max-w-7xl px-5 py-24 sm:px-8 sm:py-28">
        <Reveal>
          <p className="er-copy-sm font-medium tracking-[0.18em] text-accent uppercase">
            Coming soon
          </p>
          <h2
            id="integrations-heading"
            className="er-display-lg mt-4 max-w-[16ch] text-foreground"
          >
            Connected to where your content already lives.
          </h2>
        </Reveal>

        <ul className="mt-14 flex list-none flex-wrap gap-3 p-0">
          {COMING.map((item, i) => (
            <li key={item}>
              <Reveal delayClassName={`er-reveal-delay-${Math.min((i % 3) + 1, 3)}`}>
                <span className="er-glass inline-flex items-center gap-3 rounded-2xl px-5 py-4 font-display text-lg font-semibold tracking-tight text-foreground">
                  <span className="text-[0.65rem] font-bold tracking-[0.14em] text-subtle uppercase">
                    Soon
                  </span>
                  {item}
                </span>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
