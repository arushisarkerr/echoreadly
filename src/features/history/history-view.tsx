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

const LANES = [
  {
    id: "imported",
    label: "Recently imported",
    icon: IconImport,
    title: "No imports yet",
    description: "New uploads and URL imports will land in this lane.",
  },
  {
    id: "read",
    label: "Recently read",
    icon: IconReader,
    title: "No reading activity",
    description: "Documents you open in the reader will appear here.",
  },
  {
    id: "listened",
    label: "Recently listened",
    icon: IconListen,
    title: "No listening activity",
    description: "Audio sessions will build a listening history over time.",
  },
] as const;

export function HistoryView() {
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
            <EmptyState
              icon={<IconHistory />}
              title="Your timeline is empty"
              description="Imports, reads, listens, and AI actions will form a single readable stream."
              className="py-14"
            />
          </Card>
        </TabsContent>

        <TabsContent value="lanes" className="mt-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {LANES.map((lane) => {
              const Icon = lane.icon;
              return (
                <Card key={lane.id}>
                  <CardHeader title={lane.label} />
                  <EmptyState
                    icon={<Icon />}
                    title={lane.title}
                    description={lane.description}
                    className="py-10"
                  />
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
