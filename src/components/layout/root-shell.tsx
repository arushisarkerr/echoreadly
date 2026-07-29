import type { ReactNode } from "react";

/**
 * Application shell that establishes the root document flex structure.
 * Pages own landmark regions (`header`, `main`, `footer`) so marketing and app
 * surfaces can place chrome correctly outside `<main>`.
 */
export function RootShell({ children }: { children: ReactNode }) {
  return <div className="flex min-h-full flex-1 flex-col">{children}</div>;
}
