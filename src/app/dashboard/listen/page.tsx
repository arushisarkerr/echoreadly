import { redirect } from "next/navigation";

import { ROUTES } from "@/constants";

/** Listen gallery folded into Library (home). */
export default function ListenPage() {
  redirect(ROUTES.library);
}
