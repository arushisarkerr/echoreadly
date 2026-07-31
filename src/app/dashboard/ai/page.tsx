import { Suspense } from "react";

import { AiView } from "@/features/ai/ai-view";

export default function AiPage() {
  return (
    <Suspense fallback={null}>
      <AiView />
    </Suspense>
  );
}
