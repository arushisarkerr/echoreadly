import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { IconStar, IconTrash } from "@/components/icons/dashboard-icons";
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
  thumbnailUrl,
  favorite = false,
  layout = "grid",
  selected = false,
  selecting = false,
  onToggleSelect,
  onOpen,
  onDelete,
  deleteDisabled = false,
}: {
  title?: string;
  language?: string;
  duration?: string;
  createdAt?: string;
  tags?: string[];
  thumbnailUrl?: string | null;
  favorite?: boolean;
  layout?: "grid" | "list";
  selected?: boolean;
  selecting?: boolean;
  onToggleSelect?: () => void;
  onOpen?: () => void;
  onDelete?: () => void;
  deleteDisabled?: boolean;
}) {
  return (
    <Card
      interactive
      padding="sm"
      className={cn(
        "flex gap-2",
        layout === "list" ? "flex-row items-center" : "flex-col",
        selected && "border-foreground/30",
      )}
      onClick={selecting ? onToggleSelect : onOpen}
      role={selecting || onOpen ? "button" : undefined}
      aria-pressed={selecting ? selected : undefined}
    >
      <div
        className={cn(
          "relative shrink-0 overflow-hidden rounded-lg border border-border bg-surface-muted",
          layout === "list" ? "size-8" : "aspect-[4/3] w-full",
        )}
        aria-hidden="true"
      >
        {thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumbnailUrl} alt="" className="size-full object-cover" />
        ) : null}
        {selecting ? (
          <span
            className={cn(
              "absolute left-1.5 top-1.5 size-4 rounded border border-border bg-background",
              selected && "border-foreground bg-foreground",
            )}
          />
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-1.5">
          <h3 className="truncate font-display text-sm font-semibold text-foreground">
            {title}
          </h3>
          <div className="flex shrink-0 items-center gap-0.5">
            {onDelete && !selecting ? (
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                aria-label={`Delete ${title}`}
                disabled={deleteDisabled}
                onClick={(event) => {
                  event.stopPropagation();
                  onDelete();
                }}
              >
                <IconTrash className="size-3.5" />
              </Button>
            ) : null}
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              aria-label={favorite ? "Unfavorite" : "Favorite"}
              onClick={(event) => event.stopPropagation()}
            >
              <IconStar className={favorite ? "fill-current" : undefined} />
            </Button>
          </div>
        </div>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          <Badge>{language}</Badge>
          <Badge>{duration}</Badge>
          <Badge>{createdAt}</Badge>
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
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
