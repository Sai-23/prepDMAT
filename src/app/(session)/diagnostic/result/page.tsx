import Link from "next/link";
import { redirect } from "next/navigation";

import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCompletedPublicDiagnostic, getPublicDiagnosticStatus } from "@/lib/onboarding/public-diagnostic";

export default async function PublicDiagnosticResultPage() {
  const completed = await getCompletedPublicDiagnostic();
  if (!completed) {
    const status = await getPublicDiagnosticStatus();
    if (status === "in_progress") redirect("/diagnostic/take");
    redirect("/diagnostic");
  }
  const { profile } = completed;
  const ranked = [...profile.modules].sort((left, right) => right.correct - left.correct);

  return (
    <PageShell
      eyebrow="Initial signal"
      title="Your Core starting point"
      description="This short diagnostic is a starting guide, not an official score prediction."
    >
      <div className="mx-auto max-w-4xl space-y-5">
        <Card>
          <CardHeader>
            <CardTitle>{profile.totalCorrect} of {profile.totalQuestions} correct</CardTitle>
            <CardDescription>{profile.confidenceDescription}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
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
            <CardTitle>Your next step</CardTitle>
            <CardDescription>
              {ranked[0]?.label} is your strongest starting area. Begin with {ranked.at(-1)?.label} to build a more balanced Core profile.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg"><Link href="/register">Create free account</Link></Button>
            <Button asChild size="lg" variant="outline"><Link href="/login">Sign in to keep this result</Link></Button>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}

