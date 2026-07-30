/**
 * Security response headers for EchoReadly.
 */

export type SecurityHeaderMap = Record<string, string>;

/**
 * Baseline security headers for HTML and API responses.
 */
export function getSecurityHeaders(): SecurityHeaderMap {
  const csp = [
    "default-src 'self'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "form-action 'self'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "style-src 'self' 'unsafe-inline'",
    // Next.js + Supabase + OpenAI require script/connect flexibility in beta.
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.openai.com",
    "media-src 'self' blob:",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
  ].join("; ");

  const headers: SecurityHeaderMap = {
    "Content-Security-Policy": csp,
    "X-Frame-Options": "DENY",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy":
      "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
    "X-DNS-Prefetch-Control": "off",
  };

  // Production builds ship HSTS. Browsers only honor it over HTTPS origins.
  if (process.env.NODE_ENV === "production") {
    headers["Strict-Transport-Security"] =
      "max-age=63072000; includeSubDomains; preload";
  }

  return headers;
}

/**
 * Apply security headers onto a mutable Headers instance / NextResponse cookies bag.
 */
export function applySecurityHeaders(headers: Headers): void {
  const values = getSecurityHeaders();
  for (const [key, value] of Object.entries(values)) {
    headers.set(key, value);
  }
}
