"use client";

import { ArrowRight, Grid3X3, Shapes, Sigma } from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { finishOnboardingAction, startDiagnosticAction } from "@/app/onboarding/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const modules = [
  { title: "Figure Sequences", description: "Continue visual patterns", icon: Shapes },
  { title: "Mathematical Equations", description: "Solve for each letter", icon: Sigma },
  { title: "Latin Squares", description: "Complete the 5 × 5 grid", icon: Grid3X3 },
];

export function OnboardingExperience() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const navigateAfter = (operation: () => Promise<{ error: string | null }>, destination: Route) => {
    setError(null);
    startTransition(async () => {
      const result = await operation();
      if (result.error) {
        setError(result.error);
        return;
      }
      router.push(destination);
    });
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="grid gap-3 sm:grid-cols-3" aria-label="Core question formats">
        {modules.map(({ title, description, icon: Icon }) => (
          <div className="rounded-lg bg-surface-low p-4" key={title}>
            <Icon aria-hidden="true" className="h-5 w-5 text-primary" />
            <h2 className="mt-4 font-semibold">{title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          </div>
        ))}
      </div>

      <Card className="border-primary bg-primary-muted">
        <CardContent className="p-6 sm:p-8">
          <p className="text-sm font-semibold text-primary">Recommended starting point</p>
          <h2 className="mt-2 text-2xl font-semibold">Take the 15-question diagnostic</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">It is untimed, includes five questions from each Core module, and gives you a simple starting direction. Correct answers stay hidden until you finish.</p>
          <Button className="mt-6 w-full sm:w-auto" disabled={pending} onClick={() => navigateAfter(startDiagnosticAction, "/onboarding/diagnostic")} size="lg">
            {pending ? "Starting…" : "Start diagnostic"} <ArrowRight className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 border-t border-workspace-separator pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">Prefer to explore first? You can take the diagnostic later.</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button disabled={pending} onClick={() => navigateAfter(() => finishOnboardingAction("practice_first"), "/practice")} variant="secondary">Go to Practice</Button>
          <Button disabled={pending} onClick={() => navigateAfter(() => finishOnboardingAction("explore"), "/dashboard")} variant="ghost">Go to Dashboard</Button>
        </div>
      </div>

      {error ? <p aria-live="assertive" className="rounded-md bg-error-container p-3 text-sm text-error-container-foreground">{error}</p> : null}
    </div>
  );
}
