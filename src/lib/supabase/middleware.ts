import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import {
  isAuthPagePath,
  isProtectedPath,
  ROUTES,
} from "@/constants/routes";
import { applySecurityHeaders } from "@/lib/security/headers";

/**
 * Refresh the Supabase SSR session and enforce protected-route redirects.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Allow the marketing site to run before Supabase credentials are configured.
  if (!supabaseUrl || !supabaseAnonKey) {
    applySecurityHeaders(response.headers);
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });

        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  // Important: validate the user on every request so cookies stay fresh.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isApiPath = pathname.startsWith("/api/");

  if (!user && isProtectedPath(pathname)) {
    if (isApiPath) {
      const unauthorized = NextResponse.json(
        {
          ok: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Authentication required.",
          },
        },
        { status: 401 },
      );
      applySecurityHeaders(unauthorized.headers);
      return unauthorized;
    }

    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = ROUTES.login;
    loginUrl.searchParams.set("next", pathname);
    const redirect = NextResponse.redirect(loginUrl);
    applySecurityHeaders(redirect.headers);
    return redirect;
  }

  if (user && isAuthPagePath(pathname)) {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = ROUTES.dashboard;
    dashboardUrl.search = "";
    const redirect = NextResponse.redirect(dashboardUrl);
    applySecurityHeaders(redirect.headers);
    return redirect;
  }

  applySecurityHeaders(response.headers);
  return response;
}
