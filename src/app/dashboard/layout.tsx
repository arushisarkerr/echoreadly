import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AuthGuard } from "@/features/auth";
import { DashboardShell } from "@/features/dashboard";

export const metadata: Metadata = {
  title: "Dashboard",
  robots: {
    index: false,
    follow: false,
  },
};

/**
 * Application dashboard layout — auth-gated shell.
 * Session provider lives in the root layout.
 */
export default function DashboardLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <AuthGuard>
      <DashboardShell>{children}</DashboardShell>
    </AuthGuard>
  );
}
