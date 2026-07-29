import type { ReactNode } from "react";

import { Container } from "@/components/layout";

type Feature = {
  title: string;
  description: string;
  icon: ReactNode;
  comingSoon?: boolean;
};

const FEATURES: Feature[] = [
  {
    title: "AI Summary",
    description:
      "Turn long documents into clear, accurate summaries you can trust.",
    icon: <SummaryIcon />,
  },
  {
    title: "Smart Reader",
    description:
      "A focused reading view designed for clarity, pacing, and comfort.",
    icon: <ReaderIcon />,
  },
  {
    title: "Text to Speech",
    description:
      "Listen to any document with natural speech when your eyes need a break.",
    icon: <SpeechIcon />,
  },
  {
    title: "OCR",
    description:
      "Extract readable text from scans and images without leaving the flow.",
    icon: <OcrIcon />,
  },
  {
    title: "Translation",
    description:
      "Read across languages with translations that preserve meaning and tone.",
    icon: <TranslationIcon />,
  },
  {
    title: "Audio & YouTube Support",
    description:
      "Bring podcasts, uploads, and videos into the same reading workspace.",
    icon: <MediaIcon />,
    comingSoon: true,
  },
];

const cardClassName =
  "flex flex-col rounded-lg border border-border bg-surface p-6 transition-colors hover:border-foreground/15 hover:bg-background";

/**
 * Landing features grid — six capability cards with simple geometric icons.
 */
export function MarketingFeatures() {
  return (
    <section
      id="features"
      aria-labelledby="features-heading"
      className="scroll-mt-20 border-t border-border bg-background"
    >
      <Container className="py-20 sm:py-24">
        <header className="max-w-2xl">
          <h2
            id="features-heading"
            className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl"
          >
            Everything you need to read with clarity
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted sm:text-lg">
            From summaries to speech, EchoReadly keeps the tools close and the
            interface quiet.
          </p>
        </header>

        <ul className="mt-12 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
          {FEATURES.map((feature) => (
            <li key={feature.title} className={cardClassName}>
              <div
                aria-hidden="true"
                className="flex size-10 items-center justify-center rounded-md border border-border bg-surface-muted text-foreground"
              >
                {feature.icon}
              </div>

              <div className="mt-5 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <h3 className="text-base font-semibold tracking-tight text-foreground">
                  {feature.title}
                </h3>
                {feature.comingSoon ? (
                  <span className="text-xs font-medium tracking-wide text-subtle uppercase">
                    Coming Soon
                  </span>
                ) : null}
              </div>

              <p className="mt-2 text-sm leading-relaxed text-muted">
                {feature.description}
              </p>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

function IconFrame({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-5"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function SummaryIcon() {
  return (
    <IconFrame>
      <path d="M6 7h12M6 12h8M6 17h10" />
    </IconFrame>
  );
}

function ReaderIcon() {
  return (
    <IconFrame>
      <path d="M5 6h14v12H5z" />
      <path d="M9 6v12" />
    </IconFrame>
  );
}

function SpeechIcon() {
  return (
    <IconFrame>
      <path d="M11 5v14" />
      <path d="M7 9v6M15 8v8M4 11v2M18 11v2" />
    </IconFrame>
  );
}

function OcrIcon() {
  return (
    <IconFrame>
      <path d="M5 8V5h3M16 5h3v3M19 16v3h-3M8 19H5v-3" />
      <path d="M9 12h6" />
    </IconFrame>
  );
}

function TranslationIcon() {
  return (
    <IconFrame>
      <path d="M5 7h8M9 7c0 5-2 8-6 10" />
      <path d="M12 17l3-8 3 8M13.5 14h3" />
    </IconFrame>
  );
}

function MediaIcon() {
  return (
    <IconFrame>
      <path d="M4 8h10v8H4z" />
      <path d="M14 10l6-2v8l-6-2z" />
    </IconFrame>
  );
}
