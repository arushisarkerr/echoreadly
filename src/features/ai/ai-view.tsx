import Link from "next/link";

import {
  IconSpark,
  IconTranslate,
} from "@/components/icons/dashboard-icons";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { ROUTES } from "@/constants";

const AI_CARDS = [
  {
    title: "Summary",
    description: "Generate short, medium, or detailed summaries.",
    kind: "spark",
  },
  {
    title: "Translate",
    description: "Move document text into another listening language.",
    kind: "translate",
  },
  {
    title: "Ask AI",
    description: "Ask grounded questions about the open document.",
    kind: "spark",
  },
  {
    title: "Explain",
    description: "Break down dense passages into plain language.",
    kind: "spark",
  },
  {
    title: "Rewrite",
    description: "Reframe sections for clarity or tone.",
    kind: "spark",
  },
  {
    title: "Notes",
    description: "Capture AI-assisted notes beside your reading.",
    kind: "spark",
  },
  {
    title: "Key points",
    description: "Extract the essential claims and takeaways.",
    kind: "spark",
  },
] as const;

export function AiView() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="AI"
        description="Focused tools for summary, translation, and conversation."
        breadcrumbs={[
          { label: "Home", href: ROUTES.dashboard },
          { label: "AI" },
        ]}
        actions={
          <Link href={ROUTES.library}>
            <Button variant="secondary">Choose a document</Button>
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {AI_CARDS.map((card) => (
          <Card key={card.title} interactive className="flex flex-col">
            <div className="mb-4 flex size-10 items-center justify-center rounded-xl border border-border bg-surface-muted text-foreground">
              {card.kind === "translate" ? <IconTranslate /> : <IconSpark />}
            </div>
            <h3 className="font-display text-base font-semibold text-foreground">
              {card.title}
            </h3>
            <p className="mt-2 flex-1 text-sm text-muted">{card.description}</p>
            <Button variant="outline" size="sm" className="mt-5 self-start">
              Open
            </Button>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader
          title="Recent AI sessions"
          description="Reopen previous summaries, chats, and translations."
        />
        <EmptyState
          icon={<IconSpark />}
          title="No AI sessions yet"
          description="Session history will appear here after you run your first AI tool."
          className="py-12"
        />
      </Card>
    </div>
  );
}
