import Link from "next/link";
import { redirect } from "next/navigation";

import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/guards";
import { getCompletedDiagnostic, getOnboardingState } from "@/lib/onboarding/data";

export default async function OnboardingDiagnosticSummaryPage() {
  const user = await requireUser();
  const completed = await getCompletedDiagnostic(user.id);

  if (!completed) {
    const state = await getOnboardingState(user.id);
    if (state.diagnosticStatus === "in_progress") redirect("/onboarding/diagnostic");
    redirect("/onboarding");
  }

  const { profile } = completed;

  return (
    <PageShell
      eyebrow="Initial signal"
      title="Your starting Core profile"
      description="This short diagnostic is a starting guide, not an official score prediction. Practice and Core Mocks will make your next steps more useful over time."
    >
      <div className="mx-auto max-w-5xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{profile.totalCorrect} of {profile.totalQuestions} correct</CardTitle>
            <CardDescription>{profile.confidenceLabel} · {profile.confidenceDescription}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            {profile.modules.map((module) => (
              <div className="rounded-lg bg-surface-low p-4" key={module.module}>
                <p className="text-sm font-semibold">{module.label}</p>
                <p className="mt-1 text-2xl font-semibold">{module.correct}/{module.total}</p>
                <p className="mt-1 text-xs text-muted-foreground">{module.confidence}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{profile.recommendation.title}</CardTitle>
            <CardDescription>{profile.recommendation.reason}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2 text-sm">
              {profile.observations.map((observation) => <li key={observation}>{observation}</li>)}
            </ul>
            <Button asChild><Link href="/practice">Continue to Practice</Link></Button>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
