import { Container } from "@/components/layout";

const TRUST_STATS = [
  { value: "PDF", label: "Supported today" },
  { value: "3", label: "Core reading tools" },
  { value: "AI", label: "Summary built in" },
  { value: "TTS", label: "Listen when you need to" },
  { value: "Free", label: "Plan to start with" },
  { value: "6+", label: "Capabilities planned" },
] as const;

const COMING_SOON = [
  "OCR",
  "Translation",
  "Image Reader",
  "Audio Upload",
  "Website Reader",
  "YouTube Reader",
] as const;

/**
 * Social proof built from product facts — no fabricated logos or testimonials.
 */
export function SocialProof() {
  return (
    <section
      id="social-proof"
      aria-labelledby="social-proof-heading"
      className="scroll-mt-20 border-t border-border bg-surface-muted/40"
    >
      <Container className="py-20 sm:py-24">
        <header className="mx-auto max-w-2xl text-center">
          <h2
            id="social-proof-heading"
            className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl"
          >
            Built for students, professionals and lifelong learners.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted sm:text-lg">
            EchoReadly is designed for calm, focused reading — with a clear
            roadmap for the formats and tools still ahead.
          </p>
        </header>

        <dl className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6 lg:gap-5">
          {TRUST_STATS.map((stat) => (
            <div
              key={stat.label}
              className="rounded-lg border border-border bg-surface px-4 py-5 text-center"
            >
              <dd className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                {stat.value}
              </dd>
              <dt className="mt-2 text-xs leading-snug text-muted sm:text-sm">
                {stat.label}
              </dt>
            </div>
          ))}
        </dl>

        <div className="mt-12">
          <h3 className="text-center text-sm font-medium tracking-wide text-subtle uppercase">
            Coming Soon
          </h3>
          <ul className="mt-4 flex list-none flex-wrap items-center justify-center gap-2 p-0">
            {COMING_SOON.map((badge) => (
              <li
                key={badge}
                className="rounded-md border border-dashed border-border bg-surface px-3 py-1.5 text-sm text-muted"
              >
                {badge}
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </section>
  );
}
