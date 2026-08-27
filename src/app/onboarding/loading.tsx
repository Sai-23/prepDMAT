import { PageShell } from "@/components/layout/page-shell";

export default function OnboardingLoading() {
  return <PageShell eyebrow="Getting started" title="Loading your first step" description="Checking your saved onboarding and diagnostic state."><div className="mx-auto h-96 max-w-4xl animate-pulse rounded-lg border border-workspace-border bg-surface-lowest motion-reduce:animate-none" /></PageShell>;
}
