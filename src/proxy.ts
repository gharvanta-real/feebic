import { NextRequest, NextResponse } from "next/server";

function withAdminSecurityHeaders(response: NextResponse) {
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  return response;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  const adminToken = request.cookies.get("ch_admin_token")?.value;
  const isLoginPage = pathname === "/admin/login";

  if (isLoginPage && adminToken) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  if (isLoginPage) {
    return withAdminSecurityHeaders(NextResponse.next());
  }

  if (!adminToken) {
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return withAdminSecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: ["/admin/:path*"],
};
