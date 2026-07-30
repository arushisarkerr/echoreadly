import { Reveal } from "@/components/marketing/reveal";

const FAQS = [
  {
    q: "What is EchoReadly?",
    a: "A universal content-to-audio platform. Import content from almost anywhere and transform it into natural, high-quality audio using AI — then listen online or export in multiple formats.",
  },
  {
    q: "What can I import?",
    a: "PDF, DOC/DOCX, TXT, Markdown, EPUB, website URLs, blogs, news, documentation, audio files, video files, and YouTube links. Google Docs, Notion, Drive, Dropbox, and OneDrive are coming soon.",
  },
  {
    q: "Which voices and styles are available?",
    a: "Voices include Male, Female, Child, Elder, Bangla, English, Portuguese, and Hindi. Styles include Natural, Storytelling, Teacher, Podcast, Documentary, News Reader, Professional, and Calm.",
  },
  {
    q: "Can I download or export audio?",
    a: "Yes. Listen online, download, and export as MP3, M4A, or WAV.",
  },
  {
    q: "Does it include AI chat and summaries?",
    a: "Yes. Chat with your content and generate summaries without leaving the listening flow. Translation, collections, and cross-device sync are part of the product.",
  },
  {
    q: "Is there a free plan?",
    a: "Yes. Start free with core imports, online listening, basic summaries, and limited voices — then upgrade when you need more.",
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
