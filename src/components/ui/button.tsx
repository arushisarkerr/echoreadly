import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "outline" | "danger";
type ButtonSize = "sm" | "md" | "lg" | "icon";

const variantClass: Record<ButtonVariant, string> = {
  primary:
    "bg-foreground text-background hover:opacity-90 border-transparent",
  secondary:
    "bg-surface-muted text-foreground hover:bg-[color-mix(in_srgb,var(--surface-muted)_80%,var(--foreground)_6%)] border-transparent",
  ghost: "bg-transparent text-muted hover:bg-surface-muted hover:text-foreground border-transparent",
  outline:
    "bg-transparent text-foreground border-border hover:bg-surface-muted",
  danger:
    "bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] text-danger border-danger/25 hover:bg-[color-mix(in_srgb,var(--danger)_18%,transparent)]",
};

const sizeClass: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs gap-1.5 rounded-lg",
  md: "h-10 px-4 text-sm gap-2 rounded-xl",
  lg: "h-11 px-5 text-sm gap-2 rounded-xl",
  icon: "size-10 rounded-xl p-0 justify-center",
};

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  leftIcon,
  rightIcon,
  children,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center border font-semibold transition-[opacity,background-color,transform,color] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-45",
        variantClass[variant],
        sizeClass[size],
        className,
      )}
      {...props}
    >
      {leftIcon}
      {children}
      {rightIcon}
    </button>
  );
}
