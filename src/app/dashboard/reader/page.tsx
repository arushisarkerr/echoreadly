import { Suspense } from "react";

import { ReaderView } from "@/features/reader/reader-view";

export default function ReaderPage() {
  return (
    <Suspense fallback={null}>
      <ReaderView />
    </Suspense>
  );
}
