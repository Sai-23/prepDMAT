import { NextResponse, type NextRequest } from "next/server";

import { getApplicationUrl } from "@/lib/auth/config";
import { hasAnyRole } from "@/lib/auth/roles";
import { createContentSecurityPolicy } from "@/lib/security/csp";
import { updateSupabaseSession } from "@/lib/supabase/proxy";
import type { UserRole } from "@/types/auth";

const authenticatedRoutes = [
  "/onboarding",
  "/practice",
  "/tests",
  "/dashboard",
  "/progress",
  "/results",
  "/mistakes",
  "/bookmarks",
  "/profile",
];

const reviewerRoutes = ["/admin", "/admin/review"];
const adminOnlyRoutes = ["/admin/questions", "/admin/tests"];

function matchesRoute(pathname: string, routes: readonly string[]) {
  return routes.some((route) =>
    route === "/" ? pathname === route : pathname === route || pathname.startsWith(`${route}/`),
  );
}

function withRedirect() {
  return NextResponse.redirect(getApplicationUrl("/login"));
}

function withContentSecurityPolicy(response: NextResponse, policy: string) {
  response.headers.set("Content-Security-Policy", policy);
  return response;
}

function preserveSessionResponse(source: NextResponse, destination: NextResponse) {
  for (const cookie of source.cookies.getAll()) {
    destination.cookies.set(cookie);
  }
  for (const header of ["Cache-Control", "Pragma", "Expires"] as const) {
    const value = source.headers.get(header);
    if (value !== null) destination.headers.set(header, value);
  }
  return destination;
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const contentSecurityPolicy = createContentSecurityPolicy(nonce, {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  });
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", contentSecurityPolicy);
  const session = updateSupabaseSession(request, requestHeaders);
  const protectedRoute = matchesRoute(pathname, authenticatedRoutes)
    || matchesRoute(pathname, reviewerRoutes)
    || matchesRoute(pathname, adminOnlyRoutes);
  // The root layout reads auth on public pages too. Refresh here first so its
  // Server Component sees the rotated request cookie and the browser receives it.
  let user;
  try {
    const result = await session.supabase.auth.getUser();
    user = result.data.user;
  } catch (error) {
    // An Auth transport outage must not make otherwise public pages unavailable.
    // Protected routes retain their existing fail-closed error behavior.
    if (protectedRoute) throw error;
    return withContentSecurityPolicy(session.response, contentSecurityPolicy);
  }

  if (!protectedRoute) {
    return withContentSecurityPolicy(session.response, contentSecurityPolicy);
  }

  if (!user) {
    return withContentSecurityPolicy(
      preserveSessionResponse(session.response, withRedirect()),
      contentSecurityPolicy,
    );
  }

  if (matchesRoute(pathname, reviewerRoutes) || matchesRoute(pathname, adminOnlyRoutes)) {
    const { data: roles } = await session.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const roleRows = (roles ?? []) as Array<{ role: UserRole }>;
    const resolvedRoles = roleRows.map((role) => role.role);
    const allowedRoles = matchesRoute(pathname, adminOnlyRoutes)
      ? (["admin"] as const)
      : (["admin", "reviewer"] as const);

    if (!hasAnyRole(resolvedRoles, allowedRoles)) {
      return withContentSecurityPolicy(
        preserveSessionResponse(session.response, NextResponse.redirect(getApplicationUrl("/dashboard"))),
        contentSecurityPolicy,
      );
    }
  }

  return withContentSecurityPolicy(session.response, contentSecurityPolicy);
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
