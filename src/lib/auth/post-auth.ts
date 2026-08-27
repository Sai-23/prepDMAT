import "server-only";

import {
  decidePostAuthRoute,
  type PostAuthRoute,
  type PostAuthState,
} from "@/lib/auth/post-auth-routing";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type PostAuthProfileRow = {
  onboarding_completed_at: string | null;
  diagnostic_status: PostAuthState["diagnosticStatus"];
  diagnostic_session_id: string | null;
};

export async function getPostAuthRoute(userId: string): Promise<PostAuthRoute> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("onboarding_completed_at, diagnostic_status, diagnostic_session_id")
    .eq("id", userId)
    .maybeSingle()
    .overrideTypes<PostAuthProfileRow | null, { merge: false }>();

  if (error || !data) {
    throw new Error("Unable to determine the next account step.");
  }

  return decidePostAuthRoute({
    onboardingCompletedAt: data.onboarding_completed_at,
    diagnosticStatus: data.diagnostic_status,
    diagnosticSessionId: data.diagnostic_session_id,
  });
}
