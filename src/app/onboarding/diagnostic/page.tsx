import { redirect } from "next/navigation";

import { PageShell } from "@/components/layout/page-shell";
import { DiagnosticExperience } from "@/components/onboarding/diagnostic-experience";
import { requireUser } from "@/lib/auth/guards";
import { getActiveDiagnosticSession, getOnboardingState } from "@/lib/onboarding/data";

export default async function OnboardingDiagnosticPage() {
  const user = await requireUser();
  const state = await getOnboardingState(user.id);

  if (state.diagnosticStatus === "completed") redirect("/onboarding/diagnostic/summary");
  if (state.diagnosticStatus !== "in_progress") redirect("/onboarding");

  const session = await getActiveDiagnosticSession(user.id);
  if (!session) redirect("/onboarding");

  return (
    <PageShell
      eyebrow="Getting started"
      title="Initial Core diagnostic"
      description="Answer 15 untimed questions. Feedback is held until completion so it cannot influence later responses."
    >
      <DiagnosticExperience initialSession={session} />
    </PageShell>
  );
}
