"use client";

import type { SummaryType } from "@/features/ai";
import { cn } from "@/utils";

const SUMMARY_OPTIONS: Array<{ type: SummaryType; label: string }> = [
  { type: "short", label: "Short" },
  { type: "detailed", label: "Detailed" },
  { type: "bullet", label: "Bullet" },
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
    <div className="flex flex-wrap gap-2">
      {SUMMARY_OPTIONS.map((option) => (
        <button
          key={option.type}
          type="button"
          disabled={disabled}
          onClick={() => {
            onSelect(option.type);
          }}
          className={cn(
            "inline-flex h-9 items-center justify-center rounded-md border px-3 text-xs font-medium transition-colors",
            activeType === option.type
              ? "border-foreground/20 bg-surface-muted text-foreground"
              : "border-border bg-surface text-foreground hover:bg-surface-muted",
            disabled && "cursor-not-allowed opacity-50",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
