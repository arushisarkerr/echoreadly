import type { ReactNode } from "react";

import { cn } from "@/utils";

type ContainerProps = {
  children: ReactNode;
  className?: string;
  /** HTML element to render. Defaults to a semantic section wrapper. */
  as?: "div" | "section" | "main" | "article" | "header" | "footer";
};

/**
 * Constrains page content to a readable max width with consistent horizontal padding.
 * Use this as the default horizontal rhythm for marketing and app surfaces.
 */
export function Container({
  children,
  className,
  as: Tag = "div",
}: ContainerProps) {
  return (
    <Tag className={cn("mx-auto w-full max-w-5xl px-6 sm:px-8", className)}>
      {children}
    </Tag>
  );
}
