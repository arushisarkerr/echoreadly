import { Reveal } from "@/components/marketing/reveal";
import { siteConfig } from "@/config";

const FAQS = [
  {
    q: `What is ${siteConfig.name}?`,
    a: `${siteConfig.name} turns PDF, DOCX, TXT, and Markdown files into natural AI audio. Import a file, wait while it prepares, then listen — with বাংলা as the primary listening language.`,
  },
  {
    q: "What can I import?",
    a: "PDF, DOCX, TXT, and Markdown files.",
  },
  {
    q: "How does listening work?",
    a: "Import a file. We prepare it automatically and show status in Library. When it’s ready, open it and press play.",
  },
  {
    q: "Which languages can I listen in?",
    a: "বাংলা is the primary listening language. You can change listening language per document from Listen options.",
  },
  {
    q: "Can I download audio?",
    a: "Yes — download prepared MP3 files from Downloads after you listen.",
  },
  {
    q: "Is it free to use?",
    a: "Yes. Sign up to import, prepare, listen, and download MP3 audio for personal use.",
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
