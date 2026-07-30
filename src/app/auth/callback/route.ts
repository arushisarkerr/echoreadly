import { NextResponse } from "next/server";

import { ROUTES } from "@/constants/routes";
import { createClient } from "@/lib/supabase/server";

function getSafeNextPath(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return ROUTES.library;
  }
  // Align with middleware: dashboard / listen / history land on Library.
  if (
    value === ROUTES.dashboard ||
    value === ROUTES.listen ||
    value === ROUTES.history
  ) {
    return ROUTES.library;
  }
  return value;
}

/**
 * OAuth / email confirmation callback — exchanges the auth code for a session.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = getSafeNextPath(url.searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(new URL(next, url.origin));
    }
  }

  return NextResponse.redirect(
    new URL(`${ROUTES.login}?error=auth_callback`, url.origin),
  );
}
