"use client";

import type { SummaryType } from "@/features/ai";
import { cn } from "@/utils";

const SUMMARY_OPTIONS: Array<{
  type: SummaryType;
  label: string;
  hint: string;
}> = [
  { type: "short", label: "Short", hint: "Quick overview" },
  { type: "detailed", label: "Detailed", hint: "Deeper read" },
  { type: "bullet", label: "Bullet", hint: "Key points" },
];

type SummaryButtonsProps = {
  activeType: SummaryType | null;
  disabled?: boolean;
  onSelect: (summaryType: SummaryType) => void;
};

/**
 * Summary type selector buttons.
 */
export function SummaryButtons({
  activeType,
  disabled = false,
  onSelect,
}: SummaryButtonsProps) {
  return (
    <div
      className="grid grid-cols-3 gap-2"
      role="group"
      aria-label="Summary type"
    >
      {SUMMARY_OPTIONS.map((option) => {
        const active = activeType === option.type;
        return (
          <button
            key={option.type}
            type="button"
            disabled={disabled}
            aria-pressed={active}
            title={option.hint}
            onClick={() => {
              onSelect(option.type);
            }}
            className={cn(
              "flex min-h-14 flex-col items-center justify-center rounded-2xl border px-2 py-2 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active
                ? "border-foreground bg-foreground text-background"
                : "border-border/80 bg-background/50 text-foreground hover:bg-surface-muted",
              disabled && "cursor-not-allowed opacity-50",
            )}
          >
            <span className="text-xs font-semibold">{option.label}</span>
            <span
              className={cn(
                "mt-0.5 text-[0.65rem]",
                active ? "text-background/70" : "text-subtle",
              )}
            >
              {option.hint}
            </span>
          </button>
        );
      })}
    </div>
  );
}
