import { Reveal } from "@/components/marketing/reveal";

const FAQS = [
  {
    q: "What is EchoReadly?",
    a: "A PDF listening studio. Upload a PDF, generate AI summaries, chat with the document, and listen online with text-to-speech.",
  },
  {
    q: "What can I import?",
    a: "PDF uploads are available today. DOC/DOCX, TXT, Markdown, EPUB, website URLs, audio, video, and YouTube are coming soon. Cloud connectors (Google Docs, Notion, Drive, Dropbox, OneDrive) are planned.",
  },
  {
    q: "Which voices and styles are available?",
    a: "Listening uses the built-in studio TTS voice today. A multi-voice library (personas, languages, and styles) is coming soon.",
  },
  {
    q: "Can I download or export audio?",
    a: "You can listen online in the studio today. File exports such as MP3, M4A, and WAV are coming soon.",
  },
  {
    q: "Does it include AI chat and summaries?",
    a: "Yes. Chat with your PDF and generate short, detailed, or bullet summaries in the Listening Studio. Translation and collections are planned.",
  },
  {
    q: "Is there a free plan?",
    a: "Yes. Start free with PDF upload, online listening, AI summaries, and AI chat. Premium voices, exports, and extra sources are planned for paid tiers.",
  },
] as const;

/**
 * FAQ — calm editorial accordion.
 */
export function Faq() {
  return (
    <section
      id="faq"
      aria-labelledby="faq-heading"
      className="scroll-mt-24 border-t border-border"
    >
      <div className="mx-auto max-w-3xl px-5 py-24 sm:px-8 sm:py-28">
        <Reveal className="text-center">
          <h2 id="faq-heading" className="er-display-lg text-foreground">
            Questions, answered.
          </h2>
        </Reveal>

        <div className="mt-12 divide-y divide-border border-y border-border">
          {FAQS.map((item) => (
            <details key={item.q} name="faq" className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-6 text-left font-display text-lg font-semibold tracking-tight text-foreground [&::-webkit-details-marker]:hidden">
                {item.q}
                <span
                  aria-hidden="true"
                  className="text-subtle transition-transform group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="er-copy pb-6 text-muted">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
