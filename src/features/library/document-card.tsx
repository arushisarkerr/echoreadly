import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { IconStar } from "@/components/icons/dashboard-icons";
import { cn } from "@/utils";

/**
 * Library document card shell — ready for real document props later.
 */
export function DocumentCard({
  title = "Untitled document",
  language = "Language",
  duration = "Duration",
  createdAt = "Created date",
  tags = ["Tag"],
  favorite = false,
  layout = "grid",
}: {
  title?: string;
  language?: string;
  duration?: string;
  createdAt?: string;
  tags?: string[];
  favorite?: boolean;
  layout?: "grid" | "list";
}) {
  return (
    <Card
      interactive
      className={cn(
        "flex gap-4",
        layout === "list" ? "flex-row items-center" : "flex-col",
      )}
    >
      <div
        className={cn(
          "shrink-0 rounded-xl border border-border bg-surface-muted",
          layout === "list" ? "size-16" : "aspect-[4/3] w-full",
        )}
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="truncate font-display text-sm font-semibold text-foreground">
            {title}
          </h3>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 shrink-0"
            aria-label={favorite ? "Unfavorite" : "Favorite"}
          >
            <IconStar className={favorite ? "fill-current" : undefined} />
          </Button>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <Badge>{language}</Badge>
          <Badge>{duration}</Badge>
          <Badge>{createdAt}</Badge>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <Badge key={tag} tone="accent">
              {tag}
            </Badge>
          ))}
        </div>
      </div>
    </Card>
  );
}
