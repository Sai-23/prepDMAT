"use client";

import { ArrowLeft, ArrowRight, BookOpenCheck, Grid3X3, Shapes, Sigma, Timer } from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { finishOnboardingAction, startDiagnosticAction } from "@/app/onboarding/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const modules = [
  { title: "Figure Sequences", description: "Track movement, rotation, colour, and position changes.", icon: Shapes },
  { title: "Mathematical Equations", description: "Solve linked equations mentally using variables valued 1–20.", icon: Sigma },
  { title: "Latin Squares", description: "Use row and column elimination to determine the missing symbol.", icon: Grid3X3 },
];

export function OnboardingExperience() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const navigateAfter = (
    operation: () => Promise<{ error: string | null }>,
    destination: Route,
  ) => {
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
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex items-center justify-between gap-4" aria-label={`Onboarding step ${step} of 3`} role="status">
        <p className="text-sm font-semibold">Step {step} of 3</p>
        <div className="flex gap-2" aria-hidden="true">
          {[1, 2, 3].map((value) => <span className={`h-2 w-12 rounded-full ${value <= step ? "bg-primary" : "bg-surface-high"}`} key={value} />)}
        </div>
      </div>

      {step === 1 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Welcome to dMATPrep</CardTitle>
            <CardDescription>The current product focuses on the three parts of the dMAT Core Module.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            {modules.map(({ title, description, icon: Icon }) => (
              <div className="rounded-lg border border-workspace-border bg-surface-low p-4" key={title}>
                <Icon aria-hidden="true" className="h-6 w-6 text-primary" />
                <h2 className="mt-4 font-semibold">{title}</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {step === 2 ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader><BookOpenCheck aria-hidden="true" className="h-7 w-7 text-primary" /><CardTitle>Practice</CardTitle><CardDescription>Learning-oriented preparation.</CardDescription></CardHeader>
            <CardContent><ul className="space-y-2 text-sm"><li>Choose a module, difficulty, and length.</li><li>Check answers immediately.</li><li>Read deterministic worked explanations.</li></ul></CardContent>
          </Card>
          <Card>
            <CardHeader><Timer aria-hidden="true" className="h-7 w-7 text-primary" /><CardTitle>Core Mock</CardTitle><CardDescription>Assessment-oriented preparation.</CardDescription></CardHeader>
            <CardContent><ul className="space-y-2 text-sm"><li>Timed, exam-style section structure.</li><li>No correctness feedback during the attempt.</li><li>Review results after submission.</li></ul></CardContent>
          </Card>
          <Card className="md:col-span-2"><CardContent className="p-5 text-sm leading-6"><strong>How recommendations improve:</strong> 0–2 relevant answers are insufficient, 3–5 form an early estimate, 6–11 provide growing confidence, and 12+ can support a reliable estimate. A short diagnostic remains an initial signal.</CardContent></Card>
        </div>
      ) : null}

      {step === 3 ? (
        <Card>
          <CardHeader><CardTitle className="text-2xl">Choose your first step</CardTitle><CardDescription>The diagnostic is optional and is not an official dMAT score prediction.</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-primary bg-primary-muted p-5">
              <h2 className="font-semibold">Get a starting Core profile</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">Answer 15 untimed questions—five per Core module. Feedback is held until completion so later answers are not influenced.</p>
              <Button className="mt-4 w-full sm:w-auto" disabled={pending} onClick={() => navigateAfter(startDiagnosticAction, "/onboarding/diagnostic")}>Take short diagnostic <ArrowRight className="h-4 w-4" /></Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Button disabled={pending} onClick={() => navigateAfter(() => finishOnboardingAction("practice_first"), "/practice")} variant="secondary">Practice first</Button>
              <Button disabled={pending} onClick={() => navigateAfter(() => finishOnboardingAction("explore"), "/dashboard")} variant="ghost">Skip for now</Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {error ? <p aria-live="assertive" className="rounded-md bg-error-container p-3 text-sm text-error-container-foreground">{error}</p> : null}
      <div className="flex justify-between gap-3">
        <Button disabled={step === 1 || pending} onClick={() => setStep((value) => value - 1)} variant="ghost"><ArrowLeft className="h-4 w-4" />Back</Button>
        {step < 3 ? <Button disabled={pending} onClick={() => setStep((value) => value + 1)}>Continue <ArrowRight className="h-4 w-4" /></Button> : <span />}
      </div>
    </div>
  );
}
