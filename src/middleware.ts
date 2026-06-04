import { NextRequest, NextResponse } from "next/server";

// ─── Admin route protection at the EDGE ──────────────────────────────────────
// This runs server-side before any page renders. Cannot be bypassed by JS tricks.
//
// Rules:
//  1. /admin/login → allowed always (but redirects to /admin if already authed)
//  2. /admin/totp-setup → allowed only if has admin token
//  3. /admin/* → requires valid admin token cookie; else → /admin/login
//  4. / and all regular user routes → use ch_token, not admin token

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only intercept /admin routes
  if (!pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  const adminToken = request.cookies.get("ch_admin_token")?.value
    || request.headers.get("x-admin-token"); // fallback for SSR check

  const isLoginPage = pathname === "/admin/login";
  const isTOTPSetup = pathname === "/admin/totp-setup";

  // Already logged in + visiting login page → redirect to dashboard
  if (isLoginPage && adminToken) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  // Login page — always allow (no token needed)
  if (isLoginPage) {
    return NextResponse.next();
  }

  // No token → redirect to login with return path
  if (!adminToken) {
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Has token — allow through (JWT validity is verified by the API)
  // Add security headers to all admin responses
  const response = NextResponse.next();
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  return response;
}

export const config = {
  matcher: [
    // Match all /admin routes
    "/admin",
    "/admin/:path*",
  ],
};
