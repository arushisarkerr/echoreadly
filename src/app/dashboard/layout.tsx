import type { Metadata } from "next";
import type { ReactNode } from "react";

import {
  DashboardChromeProvider,
  DashboardShell,
} from "@/components/dashboard";

export const metadata: Metadata = {
  title: "Dashboard",
  robots: {
    index: false,
    follow: false,
  },
};

/**
 * Public dashboard chrome — sidebar, header, and content region.
 */
export default function DashboardLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <DashboardChromeProvider>
      <DashboardShell>{children}</DashboardShell>
    </DashboardChromeProvider>
  );
}
