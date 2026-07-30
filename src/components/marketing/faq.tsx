import { Reveal } from "@/components/marketing/reveal";
import { siteConfig } from "@/config";

const FAQS = [
  {
    q: `What is ${siteConfig.name}?`,
    a: `${siteConfig.name} turns files and links into natural AI audio. Import content, wait while it prepares, then listen — with বাংলা as the primary listening language.`,
  },
  {
    q: "What can I import?",
    a: "File uploads (starting with PDF) are available today. Website URLs and more link sources are coming soon. Cloud connectors are planned.",
  },
  {
    q: "How does listening work?",
    a: "After you import, we prepare your content and show status. When it’s ready, press play and listen to natural AI audio in the browser.",
  },
  {
    q: "Which languages can I listen in?",
    a: "বাংলা is the primary listening language. More voices and languages are planned as the library grows.",
  },
  {
    q: "Can I download or take audio with me?",
    a: "You can listen online today. Downloadable exports such as MP3, M4A, and WAV are coming soon so you can take audio with you.",
  },
  {
    q: "Is there a free plan?",
    a: "Yes. Start free to import, prepare, and listen. Premium voices, downloads, and extra sources are planned for paid tiers.",
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
