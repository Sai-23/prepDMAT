export type PostAuthState = {
  onboardingCompletedAt: string | null;
  diagnosticStatus: "not_started" | "in_progress" | "completed" | "skipped";
  diagnosticSessionId: string | null;
};

export type PostAuthRoute = "/dashboard" | "/onboarding" | "/onboarding/diagnostic";

export function decidePostAuthRoute(state: PostAuthState): PostAuthRoute {
  if (state.diagnosticStatus === "in_progress" && state.diagnosticSessionId) {
    return "/onboarding/diagnostic";
  }
  if (!state.onboardingCompletedAt) return "/onboarding";
  return "/dashboard";
}
