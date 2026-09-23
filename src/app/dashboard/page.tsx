import {
  ArrowRight,
  BookOpenCheck,
  ClipboardCheck,
  CheckCircle2,
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
import { getGeneralAcademicDashboardActivity } from "@/lib/general-academic/practice-data";
import { getGeneralAcademicLearningOverview } from "@/lib/general-academic/learning-data";
import { isGeneralAcademicUiEnabled } from "@/lib/general-academic/feature-gate";
import { GENERAL_ACADEMIC_DOMAIN_LABELS, GENERAL_ACADEMIC_SKILL_LABELS } from "@/lib/general-academic/registries";
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
  const generalAcademicEnabled = isGeneralAcademicUiEnabled();
  const [result, gamActivity, gamLearning] = await Promise.all([
    loadStudentDashboardData(user.id),
    generalAcademicEnabled ? getGeneralAcademicDashboardActivity(user.id).catch(() => ({ active: null, recent: [] })) : Promise.resolve({ active: null, recent: [] }),
    generalAcademicEnabled ? getGeneralAcademicLearningOverview(user.id, false).catch(() => null) : Promise.resolve(null),
  ]);

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

      {data.diagnosticStatus === "completed" ? (
        <Link className="flex min-h-11 items-center justify-between gap-3 rounded-lg border border-success/40 bg-success-container px-4 py-2 text-sm font-semibold text-success-container-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" href="/onboarding/diagnostic/summary"><span className="flex items-center gap-2"><CheckCircle2 aria-hidden="true" className="h-4 w-4" />Diagnostic Complete</span><span>View results →</span></Link>
      ) : data.diagnosticStatus === "in_progress" && data.primaryAction.href !== "/onboarding/diagnostic" ? (
        <Link className="flex min-h-11 items-center justify-between rounded-lg border border-workspace-border px-4 py-2 text-sm font-semibold hover:bg-surface-low" href="/onboarding/diagnostic"><span>Diagnostic in progress</span><span className="text-primary">Resume →</span></Link>
      ) : (data.diagnosticStatus === "not_started" || data.diagnosticStatus === "skipped") && data.primaryAction.kind !== "take_diagnostic" ? (
        <Link className="flex min-h-11 items-center justify-between rounded-lg border border-workspace-border px-4 py-2 text-sm font-semibold hover:bg-surface-low" href="/onboarding"><span>Core diagnostic not started</span><span className="text-primary">Take Diagnostic →</span></Link>
      ) : null}

      {data.supportingAction ? (
        <section aria-labelledby="recommended-next" className="space-y-3">
          <div>
            <h2 className="text-xl font-semibold" id="recommended-next">Recommended next</h2>
            <p className="mt-1 text-sm text-muted-foreground">Keep this for after your active session.</p>
          </div>
          <ActionCard action={data.supportingAction} secondary />
        </section>
      ) : null}

      {generalAcademicEnabled ? <section aria-labelledby="general-academic-activity" className="space-y-3">
        <div><h2 className="text-xl font-semibold" id="general-academic-activity">General Academic Practice</h2><p className="mt-1 text-sm text-muted-foreground">Apply source information, formulas, tables, graphs, and reasoning rules to unfamiliar problems.</p></div>
        <Card><CardContent className="p-5">{gamActivity.active ? <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold">{gamActivity.active.title}</p><p className="mt-1 text-sm text-muted-foreground">{GENERAL_ACADEMIC_DOMAIN_LABELS[gamActivity.active.domain]} · Question {gamActivity.active.currentQuestion} of {gamActivity.active.questionCount}</p></div><Button asChild><Link href={`/practice/general-academic/${gamActivity.active.id}`}>Resume General Academic</Link></Button></div> : <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold">Choose a published source pack</p><p className="mt-1 text-sm text-muted-foreground">Practice by domain, reasoning skill, or a mixed selection.</p></div><Button asChild variant="outline"><Link href="/practice/general-academic">Explore General Academic</Link></Button></div>}{gamActivity.recent.length ? <ol className="mt-5 divide-y divide-workspace-separator border-t border-workspace-separator pt-2">{gamActivity.recent.slice(0, 3).map((activity) => <li className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between" key={activity.id}><div><p className="text-sm font-semibold">{activity.title}</p><p className="text-xs text-muted-foreground">{GENERAL_ACADEMIC_DOMAIN_LABELS[activity.domain]} · {activity.correctCount ?? 0}/{activity.questionCount} correct</p></div><Link className="text-sm font-semibold text-primary" href={`/practice/general-academic/${activity.id}/results`}>View results →</Link></li>)}</ol> : null}</CardContent></Card>
        {gamLearning?.recommendations[0] && gamLearning.recommendations[0].priority <= 3 ? <Card className="border-primary/40 bg-primary-muted"><CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-wide text-primary">Continue improving</p><p className="mt-1 font-semibold">{gamLearning.recommendations[0].type === "skill" ? GENERAL_ACADEMIC_SKILL_LABELS[gamLearning.recommendations[0].target] : gamLearning.recommendations[0].type === "domain" ? GENERAL_ACADEMIC_DOMAIN_LABELS[gamLearning.recommendations[0].target] : "Mixed practice"}</p><p className="mt-1 text-sm text-muted-foreground">{gamLearning.recommendations[0].reason}</p></div><Button asChild size="sm"><Link href={gamLearning.recommendations[0].href}>Practice</Link></Button></CardContent></Card> : null}
      </section> : null}

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
