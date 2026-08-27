import { redirect } from "next/navigation";

import { PageShell } from "@/components/layout/page-shell";
import { OnboardingExperience } from "@/components/onboarding/onboarding-experience";
import { requireUser } from "@/lib/auth/guards";
import { getOnboardingState } from "@/lib/onboarding/data";

export default async function OnboardingPage() {
  const user = await requireUser();
  const state = await getOnboardingState(user.id);
  if (state.diagnosticStatus === "in_progress") redirect("/onboarding/diagnostic");
  if (state.completedAt) redirect("/dashboard");

  return (
    <PageShell eyebrow="Getting started" title="Start Core preparation with context" description="A short introduction, one optional starting profile, then the normal dashboard.">
      <OnboardingExperience />
    </PageShell>
  );
}
