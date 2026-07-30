import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import {
  getAuthPublicEnvStatus,
  isProductionRuntime,
} from "@/config/validate-env";
import {
  isAuthPagePath,
  isProtectedPath,
  ROUTES,
} from "@/constants/routes";
import { applySecurityHeaders } from "@/lib/security/headers";

const AUTH_MISCONFIGURED_MESSAGE =
  "Authentication is not configured on this server.";

/**
 * Refresh the Supabase SSR session and enforce protected-route redirects.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const { pathname } = request.nextUrl;
  const authEnv = getAuthPublicEnvStatus();

  if (!authEnv.configured) {
    // Protected routes fail closed when auth env is missing/invalid.
    // Public marketing routes still render in development without credentials.
    if (isProtectedPath(pathname)) {
      if (isProductionRuntime()) {
        console.error(
          "[auth] Supabase public env missing or invalid; blocking protected route.",
          {
            path: pathname,
            missing: authEnv.missing,
            invalid: authEnv.invalid,
          },
        );
      }
      return authMisconfiguredResponse(request);
    }

    applySecurityHeaders(response.headers);
    return response;
  }

  const supabase = createServerClient(
    authEnv.supabaseUrl,
    authEnv.supabaseAnonKey,
    {
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
    },
  );

  // Important: validate the user on every request so cookies stay fresh.
  const {
    data: { user },
  } = await supabase.auth.getUser();

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
    const libraryUrl = request.nextUrl.clone();
    libraryUrl.pathname = ROUTES.library;
    libraryUrl.search = "";
    const redirect = NextResponse.redirect(libraryUrl);
    applySecurityHeaders(redirect.headers);
    return redirect;
  }

  applySecurityHeaders(response.headers);
  return response;
}

/**
 * Production-safe denial when Supabase auth env is missing or invalid.
 * Does not redirect to login (login cannot succeed without configuration).
 */
function authMisconfiguredResponse(request: NextRequest): NextResponse {
  const isApiPath = request.nextUrl.pathname.startsWith("/api/");

  if (isApiPath) {
    const json = NextResponse.json(
      {
        ok: false,
        error: {
          code: "AUTH_MISCONFIGURED",
          message: AUTH_MISCONFIGURED_MESSAGE,
        },
      },
      { status: 503 },
    );
    applySecurityHeaders(json.headers);
    return json;
  }

  const page = new NextResponse(AUTH_MISCONFIGURED_MESSAGE, {
    status: 503,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
  applySecurityHeaders(page.headers);
  return page;
}
