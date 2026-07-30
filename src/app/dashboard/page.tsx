import { redirect } from "next/navigation";

import { ROUTES } from "@/constants";

/**
 * Dashboard root — Library is the product home.
 */
export default function DashboardPage() {
  redirect(ROUTES.library);
}
