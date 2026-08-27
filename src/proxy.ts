import { NextResponse, type NextRequest } from "next/server";

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

function withRedirect(request: NextRequest) {
  const loginUrl = new URL("/login", request.url);
  return NextResponse.redirect(loginUrl);
}

function withContentSecurityPolicy(response: NextResponse, policy: string) {
  response.headers.set("Content-Security-Policy", policy);
  return response;
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
  const { supabase, response } = updateSupabaseSession(request, requestHeaders);

  if (
    !matchesRoute(pathname, authenticatedRoutes) &&
    !matchesRoute(pathname, reviewerRoutes) &&
    !matchesRoute(pathname, adminOnlyRoutes)
  ) {
    return withContentSecurityPolicy(response, contentSecurityPolicy);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return withContentSecurityPolicy(withRedirect(request), contentSecurityPolicy);
  }

  if (matchesRoute(pathname, reviewerRoutes) || matchesRoute(pathname, adminOnlyRoutes)) {
    const { data: roles } = await supabase
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
        NextResponse.redirect(new URL("/dashboard", request.url)),
        contentSecurityPolicy,
      );
    }
  }

  return withContentSecurityPolicy(response, contentSecurityPolicy);
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
