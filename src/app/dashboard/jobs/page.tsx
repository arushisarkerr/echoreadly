import { redirect } from "next/navigation";

import { ROUTES } from "@/constants";

/** Preparing status lives on Library items — not a separate app. */
export default function JobsPage() {
  redirect(ROUTES.library);
}
