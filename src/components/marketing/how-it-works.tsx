import type { ReactNode } from "react";

import { Container } from "@/components/layout";

type Step = {
  number: string;
  title: string;
  description: string;
  icon: ReactNode;
};

const STEPS: Step[] = [
  {
    number: "01",
    title: "Upload your content",
    description:
      "Upload a PDF today. More formats like images, audio, websites and YouTube are coming soon.",
    icon: <UploadIcon />,
  },
  {
    number: "02",
    title: "AI understands everything",
    description:
      "EchoReadly extracts, organizes and prepares the content for reading.",
    icon: <UnderstandIcon />,
  },
  {
    number: "03",
    title: "Read or listen",
    description:
      "Choose between reading the content yourself or listening with natural AI voices.",
    icon: <ReadListenIcon />,
  },
  {
    number: "04",
    title: "Learn faster",
    description:
      "Save time with summaries, translations and smart reading tools.",
    icon: <LearnIcon />,
  },
];

const cardClassName =
  "flex flex-col rounded-lg border border-border bg-surface p-6 transition-colors hover:border-foreground/15 hover:bg-background";

/**
 * Four-step product walkthrough for the marketing landing page.
 */
export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      aria-labelledby="how-it-works-heading"
      className="scroll-mt-20 border-t border-border bg-surface-muted/40"
    >
      <Container className="py-20 sm:py-24">
        <header className="max-w-2xl">
          <h2
            id="how-it-works-heading"
            className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl"
          >
            How it works
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted sm:text-lg">
            Four simple steps from upload to deeper understanding.
          </p>
        </header>

        <ol className="mt-12 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
          {STEPS.map((step) => (
            <li key={step.number} className={cardClassName}>
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-xs font-medium tracking-wider text-subtle">
                  {step.number}
                </span>
                <div
                  aria-hidden="true"
                  className="flex size-10 items-center justify-center rounded-md border border-border bg-surface-muted text-foreground"
                >
                  {step.icon}
                </div>
              </div>

              <h3 className="mt-5 text-base font-semibold tracking-tight text-foreground">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {step.description}
              </p>
            </li>
          ))}
        </ol>
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

function UploadIcon() {
  return (
    <IconFrame>
      <path d="M12 16V6" />
      <path d="M8 10l4-4 4 4" />
      <path d="M5 18h14" />
    </IconFrame>
  );
}

function UnderstandIcon() {
  return (
    <IconFrame>
      <path d="M12 4v3" />
      <path d="M8 20h8" />
      <path d="M9 9a3 3 0 0 1 6 0c0 2-3 3-3 5" />
      <path d="M12 17h.01" />
    </IconFrame>
  );
}

function ReadListenIcon() {
  return (
    <IconFrame>
      <path d="M5 6h9v12H5z" />
      <path d="M17 9v6" />
      <path d="M20 11v2" />
    </IconFrame>
  );
}

function LearnIcon() {
  return (
    <IconFrame>
      <path d="M5 19V7l7-3 7 3v12" />
      <path d="M12 10v9" />
      <path d="M5 19h14" />
    </IconFrame>
  );
}
