import type { Metadata } from "next";

import { ReaderPage } from "@/features/reader";

type ReaderRouteProps = {
  params: Promise<{
    path: string[];
  }>;
};

export const metadata: Metadata = {
  title: "Reader",
  robots: {
    index: false,
    follow: false,
  },
};

/**
 * Catch-all reader route.
 * Example: /dashboard/reader/pdfs/document.pdf
 */
export default async function DashboardReaderRoute({
  params,
}: ReaderRouteProps) {
  const { path } = await params;
  const storagePath = path.map((segment) => decodeURIComponent(segment)).join("/");

  return <ReaderPage storagePath={storagePath} />;
}
