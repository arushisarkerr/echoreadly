import Link from "next/link";
import type { ReactNode } from "react";

import { ROUTES } from "@/constants";

type WorkspaceCanvasProps = {
  kicker: string;
  title: string;
  description: string;
  children?: ReactNode;
  actionHref?: string;
  actionLabel?: string;
  wide?: boolean;
};

/**
 * Distinctive page frame — large type, asymmetric header action.
 */
export function WorkspaceCanvas({
  kicker,
  title,
  description,
  children,
  actionHref = ROUTES.addContent,
  actionLabel = "Add content",
  wide = true,
}: WorkspaceCanvasProps) {
  return (
    <section
      className={`mx-auto w-full px-4 py-6 sm:px-6 sm:py-8 lg:px-8 ${
        wide ? "max-w-[96rem]" : "max-w-5xl"
      }`}
    >
      <header className="grid gap-6 lg:grid-cols-[1.4fr_auto] lg:items-end">
        <div>
          <p className="text-[0.65rem] font-semibold tracking-[0.22em] text-accent uppercase">
            {kicker}
          </p>
          <h1 className="font-display mt-2 max-w-[14ch] text-[clamp(2.2rem,3.2vw,3.75rem)] font-bold leading-[0.94] tracking-[-0.045em] text-foreground">
            {title}
          </h1>
          <p className="mt-4 max-w-xl text-[0.975rem] leading-relaxed text-muted">
            {description}
          </p>
        </div>
        <Link
          href={actionHref}
          className="inline-flex h-11 items-center justify-center self-start rounded-full bg-foreground px-5 text-sm font-semibold text-background lg:self-end"
        >
          {actionLabel}
        </Link>
      </header>
      <div className="mt-10">{children}</div>
    </section>
  );
}
