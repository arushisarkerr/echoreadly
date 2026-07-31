"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import {
  IconHistory,
  IconImport,
  IconListen,
  IconReader,
} from "@/components/icons/dashboard-icons";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/overlays";
import { ROUTES } from "@/constants";
import { getImportOwnerId } from "@/features/import/utils/pdf-upload-store";

type HistoryEvent = {
  id: string;
  documentId: string | null;
  eventType: string;
  title: string;
  detail: string | null;
  createdAt: string;
};

const LANES = [
  {
    id: "imported",
    label: "Recently imported",
    icon: IconImport,
    match: ["imported"],
    title: "No imports yet",
    description: "New uploads and URL imports will land in this lane.",
  },
  {
    id: "translated",
    label: "Recently translated",
    icon: IconReader,
    match: ["translated"],
    title: "No translations yet",
    description: "Completed translations appear here.",
  },
  {
    id: "audio",
    label: "Recently listened",
    icon: IconListen,
    match: ["audio_generated"],
    title: "No listening activity",
    description: "Generated audio sessions will appear here.",
  },
] as const;

export function HistoryView() {
  const [events, setEvents] = useState<HistoryEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await fetch(
          `/api/history?ownerId=${encodeURIComponent(getImportOwnerId())}`,
        );
        const payload = (await response.json()) as {
          ok?: boolean;
          events?: HistoryEvent[];
        };
        if (!cancelled && payload.ok && payload.events) {
          setEvents(payload.events);
        }
      } catch {
        // keep empty
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const lanes = useMemo(() => {
    return LANES.map((lane) => ({
      ...lane,
      items: events.filter((event) =>
        (lane.match as readonly string[]).includes(event.eventType),
      ),
    }));
  }, [events]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="History"
        description="A calm timeline of imports, reading, and listening."
        breadcrumbs={[
          { label: "Home", href: ROUTES.dashboard },
          { label: "History" },
        ]}
      />

      <Tabs defaultValue="timeline">
        <TabsList>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="lanes">Activity lanes</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="mt-4">
          <Card>
            <CardHeader
              title="Timeline"
              description="Activity cards will stack chronologically."
              action={<Badge>Today</Badge>}
            />
            {loading ? (
              <EmptyState
                icon={<IconHistory />}
                title="Loading history"
                description="Fetching recent activity."
                className="py-14"
              />
            ) : events.length === 0 ? (
              <EmptyState
                icon={<IconHistory />}
                title="Your timeline is empty"
                description="Imports, reads, listens, and AI actions will form a single readable stream."
                className="py-14"
              />
            ) : (
              <ul className="space-y-2 p-0">
                {events.map((event) => (
                  <li
                    key={event.id}
                    className="rounded-xl border border-border/70 bg-surface-muted/40 px-3 py-2.5"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge>{event.eventType}</Badge>
                      <span className="font-medium text-foreground">
                        {event.title}
                      </span>
                      <span className="text-xs text-muted">
                        {new Date(event.createdAt).toLocaleString()}
                      </span>
                    </div>
                    {event.detail ? (
                      <p className="mt-1 text-sm text-muted">{event.detail}</p>
                    ) : null}
                    {event.documentId ? (
                      <Link
                        href={`${ROUTES.reader}?id=${encodeURIComponent(event.documentId)}`}
                        className="mt-2 inline-block text-sm text-accent"
                      >
                        Open document
                      </Link>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="lanes" className="mt-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {lanes.map((lane) => {
              const Icon = lane.icon;
              return (
                <Card key={lane.id}>
                  <CardHeader title={lane.label} />
                  {lane.items.length === 0 ? (
                    <EmptyState
                      icon={<Icon />}
                      title={lane.title}
                      description={lane.description}
                      className="py-10"
                    />
                  ) : (
                    <ul className="space-y-2 p-0">
                      {lane.items.slice(0, 8).map((item) => (
                        <li
                          key={item.id}
                          className="rounded-xl border border-border/70 px-3 py-2 text-sm"
                        >
                          {item.title}
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
