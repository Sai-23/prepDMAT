import {
  ArrowRight,
  BookOpenCheck,
  ClipboardCheck,
  Play,
  RotateCcw,
  Sparkles,
  Timer,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { PageShell } from "@/components/layout/page-shell";
import { ErrorState } from "@/components/shared/error-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { requireUser } from "@/lib/auth/guards";
import { loadStudentDashboardData } from "@/lib/dashboard/data";
import type {
  DashboardAction,
  DashboardActivity,
  DashboardProgressModule,
} from "@/lib/dashboard/model";
import type { Confidence, Trend } from "@/lib/progress/model";

const dateFormatter = new Intl.DateTimeFormat("en", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const confidenceLabels: Record<Confidence, string> = {
  insufficient_data: "Not enough data",
  early_estimate: "Early estimate",
  growing_confidence: "Growing confidence",
  reliable_estimate: "Reliable estimate",
};

const trendLabels: Record<Trend, string> = {
  improving: "Improving",
  stable: "Stable",
  declining: "Declining",
  insufficient_data: "Trend pending",
};

function scoreLabel(activity: DashboardActivity): string {
  if (activity.correctCount !== null && activity.questionCount !== null) {
    return `${activity.correctCount} / ${activity.questionCount}`;
  }
  if (activity.accuracy !== null) return `${Math.round(activity.accuracy)}%`;
  return "Completed";
}

function ActionCard({ action, secondary = false }: { action: DashboardAction; secondary?: boolean }) {
  const isResume = action.kind === "resume_mock" || action.kind === "resume_practice";
  const Icon = isResume ? RotateCcw : action.kind === "review_mock" ? ClipboardCheck : Sparkles;

  return (
    <Card
      className={
        secondary
          ? "border-workspace-border"
          : "overflow-hidden border-primary bg-primary-muted"
      }
    >
      <CardContent className={secondary ? "p-5" : "p-6 sm:p-8"}>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <span
              className={
                secondary
                  ? "rounded-md bg-surface-container p-3 text-on-surface"
                  : "rounded-md bg-primary p-3 text-primary-foreground"
              }
            >
              <Icon aria-hidden="true" className="h-6 w-6" />
            </span>
            <div className="min-w-0">
              <p className="font-mono text-xs font-semibold uppercase tracking-[0.12em] text-primary">
                {action.eyebrow}
              </p>
              <h2 className={`${secondary ? "mt-2 text-xl" : "mt-2 text-2xl sm:text-3xl"} font-semibold tracking-tight`}>
                {action.title}
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-on-surface-variant">
                {action.description}
              </p>
            </div>
          </div>
          <Button asChild className="w-full shrink-0 sm:w-auto" size={secondary ? "default" : "lg"} variant={secondary ? "secondary" : "default"}>
            <Link href={action.href as Route}>
              {action.label} <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ProgressModuleCard({ module }: { module: DashboardProgressModule }) {
  const accuracy = module.recentAccuracy === null ? "Not enough data" : `${Math.round(module.recentAccuracy)}%`;
  const trendVariant = module.trend === "improving" ? "success" : module.trend === "declining" ? "warning" : "subtle";
  return (
    <div className="rounded-lg border border-workspace-border bg-surface-lowest p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">{module.label}</h3>
          <p className="mt-1 text-xs text-muted-foreground">{confidenceLabels[module.confidence]}</p>
        </div>
        <Badge variant={trendVariant}>{trendLabels[module.trend]}</Badge>
      </div>
      <div className="mt-5 flex items-end justify-between gap-4 border-t border-workspace-separator pt-4">
        <div>
          <p className="text-xs text-muted-foreground">Recent accuracy</p>
          <p className={`${module.recentAccuracy === null ? "text-base" : "text-2xl"} mt-1 font-semibold`}>{accuracy}</p>
        </div>
        <p className="text-right text-sm text-muted-foreground">
          <strong className="text-on-surface">{module.attemptCount}</strong><br />answered
        </p>
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  const user = await requireUser();
  const result = await loadStudentDashboardData(user.id);

  if (result.error || !result.data) {
    return (
      <PageShell
        eyebrow="Student dashboard"
        title="Your Core preparation hub"
        description="Resume active work, start practice, take Core mocks, and review progress and results."
      >
        <ErrorState title="Dashboard unavailable" description={result.error} />
      </PageShell>
    );
  }

  const data = result.data;
  const hasResume = data.primaryAction.kind === "resume_mock" || data.primaryAction.kind === "resume_practice";

  return (
    <PageShell
      eyebrow="Student dashboard"
      title={`Welcome back, ${data.displayName}`}
      description="Continue where you left off or take the next useful step in your Core preparation."
    >
      {result.warnings.length ? (
        <div aria-live="polite" className="rounded-lg border border-warning bg-warning-container p-4 text-sm text-warning-container-foreground" role="status">
          {result.warnings.map((warning) => <p key={warning}>{warning}</p>)}
        </div>
      ) : null}

      <section aria-label={hasResume ? "Continue active work" : "Recommended next action"}>
        <ActionCard action={data.primaryAction} />
      </section>

      {data.supportingAction ? (
        <section aria-labelledby="recommended-next" className="space-y-3">
          <div>
            <h2 className="text-xl font-semibold" id="recommended-next">Recommended next</h2>
            <p className="mt-1 text-sm text-muted-foreground">Keep this for after your active session.</p>
          </div>
          <ActionCard action={data.supportingAction} secondary />
        </section>
      ) : null}

      <section aria-labelledby="core-progress" className="space-y-3">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold" id="core-progress">Core progress</h2>
            <p className="mt-1 text-sm text-muted-foreground">Your recent accuracy across the three Core modules.</p>
          </div>
          <Button asChild size="sm" variant="ghost">
            <Link href="/progress">View details <ArrowRight aria-hidden="true" className="h-4 w-4" /></Link>
          </Button>
        </div>
        {data.progress && data.progress.totalQuestions > 0 ? (
          <div className="grid gap-3 lg:grid-cols-3">
            {data.progress.modules.map((module) => <ProgressModuleCard key={module.module} module={module} />)}
          </div>
        ) : (
          <Card>
            <CardContent className="p-5">
              <p className="font-semibold">{data.progressUnavailable ? "Core progress is temporarily unavailable" : "Prepare for the Core Module"}</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {data.progressUnavailable
                  ? "Your resume and activity actions are still available. Try the progress page again shortly."
                  : "Your preparation covers Figure Sequences, Mathematical Equations, and Latin Squares. Complete a short practice set to start seeing your progress."}
              </p>
            </CardContent>
          </Card>
        )}
      </section>

      <section aria-labelledby="recent-activity" className="space-y-3">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold" id="recent-activity">Recent activity</h2>
            <p className="mt-1 text-sm text-muted-foreground">Your latest completed Core practice and mock work.</p>
          </div>
          <Button asChild size="sm" variant="ghost">
            <Link href="/results">Mock results <ArrowRight aria-hidden="true" className="h-4 w-4" /></Link>
          </Button>
        </div>
        <Card>
          <CardContent className="p-5">
            {data.recentActivity.length ? (
              <ol className="divide-y divide-workspace-separator">
                {data.recentActivity.map((activity) => (
                  <li className="py-4 first:pt-0 last:pb-0" key={`${activity.type}:${activity.id}`}>
                    <Link className="group grid gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:grid-cols-[auto_1fr_auto] sm:items-center" href={activity.href as Route}>
                      <span className="hidden rounded-md bg-surface-container p-2 text-primary sm:block">
                        {activity.type === "mock" ? <Timer aria-hidden="true" className="h-5 w-5" /> : <BookOpenCheck aria-hidden="true" className="h-5 w-5" />}
                      </span>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold group-hover:text-primary">{activity.title}</h3>
                          <Badge variant="subtle">{activity.type}</Badge>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {activity.subtitle} · {dateFormatter.format(new Date(activity.completedAt))}
                        </p>
                      </div>
                      <div className="flex items-center justify-between gap-3 sm:justify-end">
                        <p className="font-semibold">{scoreLabel(activity)}</p>
                        <span className="text-sm font-medium text-primary">Review</span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="py-3 text-center">
                <Play aria-hidden="true" className="mx-auto h-8 w-8 text-primary" />
                <p className="mt-3 font-semibold">No completed activity yet</p>
                <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
                  Start a short Core practice session. Completed practice and mock reviews will appear here.
                </p>
                <Button asChild className="mt-4" size="sm">
                  <Link href="/practice">Start Core Practice</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </PageShell>
  );
}
