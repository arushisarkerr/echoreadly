import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { IMPORT_SOURCES } from "@/features/import/utils/import-sources";
import { cn } from "@/utils";

export function ImportSourceCards() {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="font-display text-lg font-semibold text-foreground">
          Available sources
        </h2>
        <p className="mt-1 text-sm text-muted">
          Choose how you want to bring content into EchoReadly.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {IMPORT_SOURCES.map((source) => {
          const Icon = source.icon;
          return (
            <Card
              key={source.id}
              className={cn(
                "flex h-full flex-col",
                source.enabled
                  ? "border-accent/30"
                  : "opacity-70",
              )}
              aria-disabled={!source.enabled}
            >
              <div className="flex items-start justify-between gap-3">
                <span className="flex size-10 items-center justify-center rounded-xl border border-border bg-surface-muted text-foreground">
                  <Icon />
                </span>
                {source.enabled ? (
                  <Badge tone="accent">Available</Badge>
                ) : (
                  <Badge>Coming Soon</Badge>
                )}
              </div>
              <h3 className="font-display mt-4 text-base font-semibold text-foreground">
                {source.label}
              </h3>
              <p className="mt-2 flex-1 text-sm text-muted">{source.description}</p>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
