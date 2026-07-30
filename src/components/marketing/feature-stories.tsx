import { Reveal } from "@/components/marketing/reveal";

const STORIES = [
  {
    id: "listen",
    eyebrow: "Listen online",
    title: "Audio that plays in the studio.",
    copy: "Open a PDF and listen with text-to-speech as soon as the document is ready — no separate export step required for online playback.",
    visual: "wave",
  },
  {
    id: "intelligence",
    eyebrow: "AI chat & summary",
    title: "Ask. Skim. Keep listening.",
    copy: "Chat with the PDF and generate short, detailed, or bullet summaries in the Listening Studio — available now.",
    visual: "chat",
  },
  {
    id: "world",
    eyebrow: "Translation & collections · Planned",
    title: "Across languages. Across shelves.",
    copy: "Translation, collections, and richer organization are planned. Today, keep documents on your library shelf and work in the studio.",
    visual: "orbit",
  },
] as const;

/**
 * Feature storytelling — full narrative beats, not a repetitive card grid.
 */
export function MarketingFeatureStories() {
  return (
    <section
      id="features"
      aria-labelledby="features-heading"
      className="scroll-mt-24 border-t border-border"
    >
      <div className="mx-auto max-w-7xl px-5 py-24 sm:px-8 sm:py-32">
        <Reveal>
          <h2 id="features-heading" className="er-display-lg max-w-[14ch] text-foreground">
            Built around listening — not bolted onto reading.
          </h2>
        </Reveal>

        <div className="mt-20 space-y-24">
          {STORIES.map((story, index) => (
            <article
              key={story.id}
              className={`grid items-center gap-10 lg:grid-cols-2 lg:gap-16 ${
                index % 2 === 1 ? "lg:[&>*:first-child]:order-2" : ""
              }`}
            >
              <Reveal>
                <p className="er-copy-sm font-medium tracking-[0.18em] text-accent uppercase">
                  {story.eyebrow}
                </p>
                <h3 className="er-display-md mt-4 max-w-[16ch] text-foreground">
                  {story.title}
                </h3>
                <p className="er-copy mt-5 text-muted">{story.copy}</p>
              </Reveal>

              <Reveal delayClassName="er-reveal-delay-2">
                <StoryVisual kind={story.visual} />
              </Reveal>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function StoryVisual({ kind }: { kind: (typeof STORIES)[number]["visual"] }) {
  if (kind === "chat") {
    return (
      <div className="er-glass rounded-[1.75rem] p-6">
        <div className="space-y-3">
          <div className="max-w-[85%] rounded-2xl rounded-tl-md bg-surface-muted px-4 py-3 text-sm text-muted">
            What are the three key arguments?
          </div>
          <div className="ml-auto max-w-[90%] rounded-2xl rounded-tr-md bg-foreground px-4 py-3 text-sm text-background">
            1) Context · 2) Evidence · 3) Implications — want the short summary?
          </div>
          <div className="max-w-[70%] rounded-2xl rounded-tl-md bg-surface-muted px-4 py-3 text-sm text-muted">
            Yes — keep it concise.
          </div>
        </div>
      </div>
    );
  }

  if (kind === "orbit") {
    return (
      <div className="relative mx-auto aspect-square max-w-md">
        <div className="absolute inset-[18%] rounded-full border border-border" />
        <div className="absolute inset-[32%] rounded-full border border-dashed border-accent/40" />
        <div className="absolute inset-0 m-auto flex size-24 items-center justify-center rounded-full bg-foreground font-display text-sm font-bold text-background">
          Planned
        </div>
        {["EN", "BN", "HI", "PT"].map((label, i) => (
          <span
            key={label}
            className="er-float-a absolute rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-semibold"
            style={{
              top: `${18 + (i % 2) * 52}%`,
              left: `${12 + i * 20}%`,
              animationDelay: `${i * 0.4}s`,
            }}
          >
            {label}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className="er-glass relative overflow-hidden rounded-[1.75rem] p-8">
      <div className="flex h-40 items-end gap-1.5 sm:h-48">
        {Array.from({ length: 32 }).map((_, i) => (
          <span
            key={i}
            className="er-wave-bar flex-1 rounded-full bg-accent/75"
            style={{
              height: `${20 + ((i * 13) % 75)}%`,
              animationDelay: `${(i % 8) * 0.08}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
