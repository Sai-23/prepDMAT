import "server-only";

import { resolveDisplayName } from "@/lib/auth/display-name";
import { getCurrentUser } from "@/lib/auth/guards";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isThemePreference, type ThemePreference } from "@/lib/theme";
import type { HeaderAccountState, UserRole } from "@/types/auth";

export type RootAuthState = {
  account: HeaderAccountState | null;
  theme: ThemePreference;
};

const anonymousRootState: RootAuthState = {
  account: null,
  theme: "system",
};

export async function resolveRootAuthState(): Promise<RootAuthState> {
  let user: Awaited<ReturnType<typeof getCurrentUser>>;
  try {
    user = await getCurrentUser();
  } catch {
    return anonymousRootState;
  }

  if (!user) return anonymousRootState;

  let profile: {
    display_name: string | null;
    full_name: string | null;
    theme_preference: string | null;
  } | null = null;
  let roles: UserRole[] = [];

  try {
    const supabase = await createSupabaseServerClient();
    const [profileResult, rolesResult] = await Promise.all([
      supabase
        .from("profiles")
        .select("display_name, full_name, theme_preference")
        .eq("id", user.id)
        .maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", user.id),
    ]);
    profile = profileResult.data;
    roles = ((rolesResult.data ?? []) as Array<{ role: UserRole }>).map(({ role }) => role);
  } catch {
    // A profile lookup failure must not downgrade an authenticated user to a
    // logged-out header. User identity remains authoritative.
  }

  return {
    account: {
      userId: user.id,
      displayName: resolveDisplayName({
        profileDisplayName: profile?.display_name,
        profileFullName: profile?.full_name,
        metadataDisplayName: user.user_metadata.display_name,
        metadataFullName: user.user_metadata.full_name,
        email: user.email,
      }),
      workspace: roles.includes("admin")
        ? "admin"
        : roles.includes("reviewer")
          ? "reviewer"
          : null,
    },
    theme: isThemePreference(profile?.theme_preference)
      ? profile.theme_preference
      : "system",
  };
}
