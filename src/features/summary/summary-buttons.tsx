"use client";

import type { SummaryType } from "@/features/ai";
import { cn } from "@/utils";

const LISTEN_MODE_OPTIONS: Array<{
  type: SummaryType;
  label: string;
  hint: string;
}> = [
  { type: "detailed", label: "Listen to Everything", hint: "Full document" },
  { type: "short", label: "Quick Listen", hint: "Short take" },
  { type: "bullet", label: "Key Moments", hint: "Highlights" },
];

type SummaryButtonsProps = {
  activeType: SummaryType | null;
  disabled?: boolean;
  onSelect: (summaryType: SummaryType) => void;
};

/**
 * Listening mode selector — same summary engine under the hood.
 */
export function SummaryButtons({
  activeType,
  disabled = false,
  onSelect,
}: SummaryButtonsProps) {
  return (
    <div
      className="grid grid-cols-1 gap-2 sm:grid-cols-3"
      role="group"
      aria-label="Listening mode"
    >
      {LISTEN_MODE_OPTIONS.map((option) => {
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
              "flex min-h-[3.75rem] flex-col items-start justify-center rounded-2xl border px-3.5 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-16 sm:items-center sm:text-center",
              active
                ? "border-foreground bg-foreground text-background"
                : "border-border/80 bg-background/50 text-foreground hover:bg-surface-muted",
              disabled && "cursor-not-allowed opacity-50",
            )}
          >
            <span className="text-xs font-semibold leading-snug sm:text-[0.8rem]">
              {option.label}
            </span>
            <span
              className={cn(
                "mt-1 text-[0.65rem] leading-snug",
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
