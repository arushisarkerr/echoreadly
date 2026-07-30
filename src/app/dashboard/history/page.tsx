import { redirect } from "next/navigation";

import { ROUTES } from "@/constants";

/** History folded into Library (home). */
export default function HistoryPage() {
  redirect(ROUTES.library);
}
