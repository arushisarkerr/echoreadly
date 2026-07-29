import type { Metadata } from "next";

import { LibraryPage } from "@/features/library";

export const metadata: Metadata = {
  title: "Library",
  robots: {
    index: false,
    follow: false,
  },
};

/**
 * Dashboard library route — PDFs from Supabase Storage.
 */
export default function DashboardLibraryRoute() {
  return <LibraryPage />;
}
