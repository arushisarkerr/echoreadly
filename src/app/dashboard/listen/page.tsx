import { Suspense } from "react";

import { ListenView } from "@/features/listen/listen-view";

export default function ListenPage() {
  return (
    <Suspense fallback={null}>
      <ListenView />
    </Suspense>
  );
}
