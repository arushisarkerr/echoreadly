import { Container } from "@/components/layout";

const FAQS = [
  {
    question: "What is EchoReadly?",
    answer:
      "EchoReadly is an AI-powered reading platform that helps you upload documents, generate clear summaries, read with focus, and listen with text-to-speech.",
  },
  {
    question: "Which file types are supported?",
    answer:
      "PDF upload is available for the current MVP. Support for images, audio, websites, and YouTube is planned for future releases.",
  },
  {
    question: "Will OCR be available?",
    answer:
      "Yes. OCR is on the product roadmap so scanned documents and images can become readable text inside EchoReadly.",
  },
  {
    question: "Can I listen instead of reading?",
    answer:
      "Yes. Text-to-speech lets you listen to your content with natural voices whenever reading on-screen is not convenient.",
  },
  {
    question: "Which languages will be supported?",
    answer:
      "Translation support is planned so you can read across languages while preserving meaning and tone. Coverage will expand over time.",
  },
  {
    question: "Is there a free plan?",
    answer:
      "Yes. EchoReadly includes a Free plan with PDF reading, basic AI summaries, and limited text-to-speech so you can start without commitment.",
  },
] as const;

/**
 * Landing FAQ using native disclosure widgets — CSS-only accordion, no JS packages.
 */
export function Faq() {
  return (
    <section
      id="faq"
      aria-labelledby="faq-heading"
      className="scroll-mt-20 border-t border-border bg-background"
    >
      <Container className="py-20 sm:py-24">
        <header className="mx-auto max-w-2xl text-center">
          <h2
            id="faq-heading"
            className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl"
          >
            Frequently asked questions
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted sm:text-lg">
            Quick answers about what EchoReadly is and what is coming next.
          </p>
        </header>

        <div className="mx-auto mt-12 max-w-2xl divide-y divide-border rounded-lg border border-border bg-surface">
          {FAQS.map((item) => (
            <details
              key={item.question}
              name="faq"
              className="group px-5 open:bg-background sm:px-6"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-left text-base font-medium tracking-tight text-foreground transition-colors hover:text-foreground/80 [&::-webkit-details-marker]:hidden">
                <span>{item.question}</span>
                <span
                  aria-hidden="true"
                  className="flex size-6 shrink-0 items-center justify-center rounded-md border border-border text-sm text-subtle transition-transform group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="pb-5 text-sm leading-relaxed text-muted sm:text-base">
                {item.answer}
              </p>
            </details>
          ))}
        </div>
      </Container>
    </section>
  );
}
