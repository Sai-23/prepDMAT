import "server-only";

import type { Route } from "next";
import { redirect } from "next/navigation";
import { cache } from "react";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasAnyRole } from "@/lib/auth/roles";
import type { UserRole } from "@/types/auth";

export const getCurrentUser = cache(async () => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
});

export async function requireUser(redirectTo: Route = "/login") {
  const user = await getCurrentUser();

  if (!user) {
    redirect(redirectTo);
  }

  return user;
}

export async function requireRole(
  allowedRoles: readonly UserRole[],
  redirectTo: Route = "/dashboard",
) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  const roleRows = (roles ?? []) as Array<{ role: UserRole }>;
  const resolvedRoles = roleRows.map((role) => role.role);

  if (!hasAnyRole(resolvedRoles, allowedRoles)) {
    redirect(redirectTo);
  }

  return { user, roles: resolvedRoles };
}
