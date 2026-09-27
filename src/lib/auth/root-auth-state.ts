import "server-only";

import { resolveDisplayName } from "@/lib/auth/display-name";
import { getCurrentUser } from "@/lib/auth/guards";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isThemePreference, type ThemePreference } from "@/lib/theme";
import type { HeaderAccountState, UserRole } from "@/types/auth";
import type { StudentDiagnosticStatus } from "@/lib/constants/navigation";

export type RootAuthState = {
  account: HeaderAccountState | null;
  diagnosticStatus: StudentDiagnosticStatus | null;
  theme: ThemePreference;
};

const anonymousRootState: RootAuthState = {
  account: null,
  diagnosticStatus: null,
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

  let headerState: {
    display_name: string | null;
    full_name: string | null;
    theme_preference: string | null;
    diagnostic_status: StudentDiagnosticStatus;
    roles: UserRole[];
  } | null = null;

  try {
    const supabase = await createSupabaseServerClient();
    const result = await supabase
      .from("user_header_state")
      .select("display_name, full_name, theme_preference, diagnostic_status, roles")
      .eq("id", user.id)
      .maybeSingle();
    headerState = result.data;
  } catch {
    // A profile lookup failure must not downgrade an authenticated user to a
    // logged-out header. User identity remains authoritative.
  }

  return {
    account: {
      userId: user.id,
      displayName: resolveDisplayName({
        profileDisplayName: headerState?.display_name,
        profileFullName: headerState?.full_name,
        metadataDisplayName: user.user_metadata.display_name,
        metadataFullName: user.user_metadata.full_name,
        email: user.email,
        phone: user.phone,
      }),
      workspace: headerState?.roles.includes("admin")
        ? "admin"
        : headerState?.roles.includes("reviewer")
          ? "reviewer"
          : null,
    },
    diagnosticStatus: headerState?.diagnostic_status ?? null,
    theme: isThemePreference(headerState?.theme_preference)
      ? headerState.theme_preference
      : "system",
  };
}
