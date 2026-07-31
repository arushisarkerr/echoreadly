import type { InputHTMLAttributes, ReactNode } from "react";

import { cn } from "@/utils";

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  hint?: string;
  leftSlot?: ReactNode;
  rightSlot?: ReactNode;
};

export function Input({
  className,
  label,
  hint,
  leftSlot,
  rightSlot,
  id,
  ...props
}: InputProps) {
  const inputId = id ?? props.name;

  return (
    <label className="block space-y-1.5">
      {label ? (
        <span className="text-sm font-medium text-foreground">{label}</span>
      ) : null}
      <span className="relative flex items-center">
        {leftSlot ? (
          <span className="pointer-events-none absolute left-3 text-subtle">
            {leftSlot}
          </span>
        ) : null}
        <input
          id={inputId}
          className={cn(
            "h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground placeholder:text-subtle transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            Boolean(leftSlot) && "pl-10",
            Boolean(rightSlot) && "pr-10",
            className,
          )}
          {...props}
        />
        {rightSlot ? (
          <span className="absolute right-3 text-subtle">{rightSlot}</span>
        ) : null}
      </span>
      {hint ? <span className="text-xs text-subtle">{hint}</span> : null}
    </label>
  );
}
