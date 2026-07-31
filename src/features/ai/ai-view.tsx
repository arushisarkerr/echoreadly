"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

import {
  IconSpark,
  IconTranslate,
} from "@/components/icons/dashboard-icons";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { ROUTES } from "@/constants";
import { getImportOwnerId } from "@/features/import/utils/pdf-upload-store";
import type { AiAction } from "@/features/ai/run-document-ai";

const AI_CARDS: Array<{
  title: string;
  description: string;
  kind: "spark" | "translate";
  action?: AiAction;
}> = [
  {
    title: "Summary",
    description: "Generate short, medium, or detailed summaries.",
    kind: "spark",
    action: "summary",
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
    action: "ask",
  },
  {
    title: "Explain",
    description: "Break down dense passages into plain language.",
    kind: "spark",
    action: "explain",
  },
  {
    title: "Quiz",
    description: "Create practice questions from the document.",
    kind: "spark",
    action: "quiz",
  },
  {
    title: "Flashcards",
    description: "Build Q/A cards from key concepts.",
    kind: "spark",
    action: "flashcards",
  },
  {
    title: "Key points",
    description: "Extract the essential claims and takeaways.",
    kind: "spark",
    action: "key_points",
  },
];

export function AiView() {
  const searchParams = useSearchParams();
  const documentId = searchParams.get("id")?.trim() ?? "";
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runAction(action: AiAction) {
    if (!documentId) {
      setError("Choose a document from the Library first.");
      return;
    }
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const response = await fetch("/api/documents/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ownerId: getImportOwnerId(),
          documentId,
          action,
          question: action === "ask" ? question : undefined,
        }),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        result?: string;
        error?: string;
      };
      if (!response.ok || !payload.ok || !payload.result) {
        throw new Error(payload.error || "AI request failed.");
      }
      setResult(payload.result);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "AI request failed.");
    } finally {
      setBusy(false);
    }
  }

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

      {documentId ? (
        <Card>
          <p className="text-sm text-muted">
            Using document <span className="text-foreground">{documentId}</span>
          </p>
          <div className="mt-3">
            <Input
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Ask a question about this document…"
              aria-label="Ask AI question"
            />
          </div>
        </Card>
      ) : null}

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
            {card.kind === "translate" ? (
              <Link
                href={
                  documentId
                    ? `${ROUTES.reader}?id=${encodeURIComponent(documentId)}`
                    : ROUTES.reader
                }
                className="mt-5 self-start"
              >
                <Button variant="outline" size="sm">
                  Open
                </Button>
              </Link>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="mt-5 self-start"
                disabled={busy || !card.action}
                onClick={() => {
                  if (card.action) {
                    void runAction(card.action);
                  }
                }}
              >
                {busy ? "Running…" : "Open"}
              </Button>
            )}
          </Card>
        ))}
      </div>

      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}

      <Card>
        {result ? (
          <pre className="whitespace-pre-wrap text-sm leading-6 text-foreground">
            {result}
          </pre>
        ) : (
          <EmptyState
            icon={<IconSpark />}
            title="AI output"
            description="Summaries, answers, quizzes, and flashcards appear here."
            className="py-12"
          />
        )}
      </Card>
    </div>
  );
}
