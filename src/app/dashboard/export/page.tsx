import { Suspense } from "react";

import { ExportView } from "@/features/export/export-view";

export default function ExportPage() {
  return (
    <Suspense fallback={null}>
      <ExportView />
    </Suspense>
  );
}
