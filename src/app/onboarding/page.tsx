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
    <PageShell eyebrow="Getting started" title="Choose your starting point" description="Meet the three Core formats, then take a short diagnostic or go straight to Practice.">
      <OnboardingExperience />
    </PageShell>
  );
}
