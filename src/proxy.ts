import { NextResponse, type NextRequest } from "next/server";

import { hasAnyRole } from "@/lib/auth/roles";
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

function withRedirect(request: NextRequest, pathname: string) {
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const { supabase, response } = updateSupabaseSession(request);

  if (
    !matchesRoute(pathname, authenticatedRoutes) &&
    !matchesRoute(pathname, reviewerRoutes) &&
    !matchesRoute(pathname, adminOnlyRoutes)
  ) {
    return response;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return withRedirect(request, pathname);
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
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
