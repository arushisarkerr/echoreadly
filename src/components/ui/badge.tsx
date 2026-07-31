import type { HTMLAttributes } from "react";

import { cn } from "@/utils";

type BadgeTone = "neutral" | "accent" | "success" | "warning" | "danger";

const toneClass: Record<BadgeTone, string> = {
  neutral: "border-border bg-surface-muted text-muted",
  accent:
    "border-accent/25 bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] text-foreground",
  success:
    "border-success/25 bg-[color-mix(in_srgb,var(--success)_12%,transparent)] text-success",
  warning:
    "border-warning/25 bg-[color-mix(in_srgb,var(--warning)_12%,transparent)] text-warning",
  danger:
    "border-danger/25 bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] text-danger",
};

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: BadgeTone;
};

export function Badge({
  className,
  tone = "neutral",
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[0.65rem] font-semibold tracking-wide",
        toneClass[tone],
        className,
      )}
      {...props}
    />
  );
}
