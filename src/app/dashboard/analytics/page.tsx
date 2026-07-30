import { redirect } from "next/navigation";

import { ROUTES } from "@/constants";

/** Analytics is not part of the personal app surface. */
export default function AnalyticsPage() {
  redirect(ROUTES.library);
}
