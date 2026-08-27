import { ArrowRight, BarChart3, CheckCircle2, Target, TrendingDown, TrendingUp } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { PageShell } from "@/components/layout/page-shell";
import { ErrorState } from "@/components/shared/error-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/guards";
import { getCoreProgress } from "@/lib/progress/data";
import type {
  DifficultyMetric,
  ModuleProgress,
  PerformanceStatus,
  ProgressMetric,
  Trend,
} from "@/lib/progress/model";

const statusLabels: Record<PerformanceStatus, string> = {
  needs_attention: "Needs attention",
  developing: "Developing",
  stable: "Stable",
  strong: "Strong",
  insufficient_data: "Not enough data",
};

const trendLabels: Record<Trend, string> = {
  improving: "Improving",
  stable: "Stable",
  declining: "Needs attention",
  insufficient_data: "Not enough history",
};

function pct(value: number | null) {
  return value === null ? "Not enough data" : `${Math.round(value)}%`;
}

function seconds(value: number | null) {
  if (value === null) return "Not enough data";
  const rounded = Math.round(value);
  return `${Math.floor(rounded / 60)}m ${String(rounded % 60).padStart(2, "0")}s`;
}

function badgeVariant(status: PerformanceStatus | Trend) {
  return status === "strong" || status === "improving" ? "success" as const
    : status === "needs_attention" || status === "declining" ? "warning" as const
      : "subtle" as const;
}

function TrendIcon({ trend }: { trend: Trend }) {
  return trend === "improving" ? <TrendingUp aria-hidden="true" className="h-4 w-4" />
    : trend === "declining" ? <TrendingDown aria-hidden="true" className="h-4 w-4" />
      : <BarChart3 aria-hidden="true" className="h-4 w-4" />;
}

function moduleAccuracy(module: ModuleProgress) {
  return module.recentAccuracy ?? module.accuracy;
}

function ModuleOverview({ module }: { module: ModuleProgress }) {
  return (
    <div className="rounded-lg border border-workspace-border bg-surface-lowest p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-on-surface">{module.label}</h3>
          <p className="mt-2 text-3xl font-semibold text-on-surface">{pct(moduleAccuracy(module))}</p>
        </div>
        <Badge variant={badgeVariant(module.trend)}>
          <TrendIcon trend={module.trend} /> {trendLabels[module.trend]}
        </Badge>
      </div>
    </div>
  );
}

function ModuleInsight({ label, module }: { label: "Strongest area" | "Needs work"; module: ModuleProgress }) {
  return (
    <div className="min-w-0 py-1">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="mt-2 text-lg font-semibold text-on-surface">{module.label}</p>
      <p className="mt-1 text-2xl font-semibold text-on-surface">{pct(moduleAccuracy(module))}</p>
    </div>
  );
}

function DifficultyRow({ label, metric }: { label: string; metric: DifficultyMetric }) {
  return (
    <div className="grid grid-cols-[5rem_1fr_auto] items-center gap-3 text-sm">
      <span className="font-medium">{label}</span>
      <div
        aria-label={`${label}: ${pct(metric.accuracy)} from ${metric.attempts} questions`}
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={metric.accuracy === null ? undefined : Math.round(metric.accuracy)}
        className="h-2 overflow-hidden rounded-full bg-surface-container"
        role="progressbar"
      >
        <div className="h-full rounded-full bg-primary" style={{ width: `${metric.accuracy ?? 0}%` }} />
      </div>
      <span className="min-w-24 text-right text-muted-foreground">
        {metric.attempts ? `${pct(metric.accuracy)} · ${metric.attempts}` : "No data"}
      </span>
    </div>
  );
}

function SourceComparison({ metric }: { metric: ProgressMetric }) {
  const sources = [
    ["Practice", metric.sourceMix.practice],
    ["Full Core mocks", metric.sourceMix.generated_mock],
    ["Custom mocks", metric.sourceMix.curated_mock],
  ] as const;
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {sources.filter(([, value]) => value.attempts > 0).map(([label, value]) => (
        <div className="rounded-md bg-surface-low p-3" key={label}>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="mt-1 font-semibold">{pct(value.accuracy)}</p>
          <p className="text-xs text-muted-foreground">{value.attempts} questions</p>
        </div>
      ))}
    </div>
  );
}

function DetailedBreakdown({ modules }: { modules: ModuleProgress[] }) {
  const recentActivity = modules
    .flatMap((module) => module.recentSessions.map((session) => ({ ...session, module: module.label })))
    .sort((first, second) => second.answeredAt.localeCompare(first.answeredAt))
    .slice(0, 6);

  return (
    <details className="group rounded-lg border border-workspace-border bg-surface-lowest">
      <summary className="cursor-pointer list-none rounded-lg px-5 py-4 font-semibold text-on-surface outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
        <span className="flex items-center justify-between gap-4">
          View detailed breakdown
          <span aria-hidden="true" className="text-primary transition-transform group-open:rotate-45 motion-reduce:transition-none">+</span>
        </span>
      </summary>
      <div className="space-y-8 border-t border-workspace-separator p-5">
        <section aria-labelledby="skill-breakdown" className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold" id="skill-breakdown">Skills</h2>
            <p className="mt-1 text-sm text-muted-foreground">Patterns with at least three relevant answers.</p>
          </div>
          <div className="divide-y divide-workspace-separator">
            {modules.map((module) => {
              const skills = module.skills.filter((skill) => skill.attemptCount >= 3);
              return (
                <section className="py-4 first:pt-0" key={module.module}>
                  <h3 className="font-semibold">{module.label}</h3>
                  {skills.length ? (
                    <div className="mt-3 space-y-3">
                      {skills.map((skill) => (
                        <div className="grid gap-2 text-sm sm:grid-cols-[1fr_auto_auto] sm:items-center" key={skill.skillId}>
                          <div>
                            <p className="font-medium text-on-surface">{skill.label}</p>
                            <p className="text-xs text-muted-foreground">{skill.attemptCount} relevant questions</p>
                          </div>
                          <p><span className="text-muted-foreground">Recent </span><strong>{pct(skill.recentAccuracy)}</strong></p>
                          <Badge variant={badgeVariant(skill.status)}>{statusLabels[skill.status]}</Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-muted-foreground">Complete a few more questions to unlock these details.</p>
                  )}
                </section>
              );
            })}
          </div>
        </section>

        <section aria-labelledby="difficulty-breakdown" className="space-y-5">
          <div>
            <h2 className="text-xl font-semibold" id="difficulty-breakdown">Difficulty and format</h2>
            <p className="mt-1 text-sm text-muted-foreground">Compare results only when you need a closer look.</p>
          </div>
          {modules.map((module) => (
            <div className="space-y-3 border-t border-workspace-separator pt-4 first:border-0 first:pt-0" key={module.module}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-semibold">{module.label}</h3>
                <span className="text-xs text-muted-foreground">Median answer time {seconds(module.medianResponseTime)}</span>
              </div>
              <DifficultyRow label="Easy" metric={module.difficultyMix.easy} />
              <DifficultyRow label="Medium" metric={module.difficultyMix.medium} />
              <DifficultyRow label="Hard" metric={module.difficultyMix.hard} />
              <SourceComparison metric={module} />
            </div>
          ))}
        </section>

        {recentActivity.length ? (
          <section aria-labelledby="recent-activity">
            <h2 className="text-xl font-semibold" id="recent-activity">Recent activity</h2>
            <ol className="mt-3 divide-y divide-workspace-separator">
              {recentActivity.map((session) => (
                <li className="flex items-center justify-between gap-4 py-2.5 text-sm" key={`${session.module}:${session.sessionId}`}>
                  <span className="text-muted-foreground">
                    {new Intl.DateTimeFormat("en", { day: "numeric", month: "short" }).format(new Date(session.answeredAt))} · {session.module}
                  </span>
                  <strong>{Math.round(session.accuracy)}%</strong>
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        <div className="flex flex-col gap-3 border-t border-workspace-separator pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">Review completed mock results and individual answers.</p>
          <Button asChild variant="secondary">
            <Link href="/results">View Results <ArrowRight aria-hidden="true" className="h-4 w-4" /></Link>
          </Button>
        </div>
      </div>
    </details>
  );
}

export default async function ProgressPage() {
  const user = await requireUser();
  let progress;
  try {
    progress = await getCoreProgress(user.id);
  } catch {
    return (
      <PageShell eyebrow="Progress" title="How am I doing?" description="Progress from completed Core practice and assessments.">
        <ErrorState title="Progress unavailable" description="We could not load your progress. Try again shortly." />
      </PageShell>
    );
  }

  if (progress.totalQuestions === 0) {
    return (
      <PageShell eyebrow="Progress" title="How am I doing?" description="Your progress will appear as you complete Practice and Mock questions.">
        <Card className="mx-auto max-w-2xl">
          <CardContent className="p-8 text-center sm:p-12">
            <Target aria-hidden="true" className="mx-auto h-10 w-10 text-primary" />
            <h2 className="mt-5 text-2xl font-semibold">Complete your first few practice sessions</h2>
            <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-muted-foreground">
              Complete your first few practice sessions to see meaningful progress.
            </p>
            <Button asChild className="mt-6"><Link href="/practice">Start Practice <ArrowRight aria-hidden="true" className="h-4 w-4" /></Link></Button>
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  const activeModules = progress.modules.filter((module) => module.attemptCount > 0);
  const rankedModules = progress.modules
    .filter((module) => module.attemptCount >= 3 && moduleAccuracy(module) !== null)
    .sort((first, second) => (moduleAccuracy(second) ?? 0) - (moduleAccuracy(first) ?? 0));
  const strongest = rankedModules[0] ?? null;
  const needsWork = rankedModules.length > 1 ? rankedModules[rankedModules.length - 1] : null;
  const recommendation = progress.recommendations[0] ?? null;
  const recommendationModule = recommendation
    ? progress.modules.find((module) => module.module === recommendation.module)
    : null;

  return (
    <PageShell eyebrow="Progress" title="How am I doing?" description={`${progress.totalQuestions} answered questions across Practice and Mock Tests.`}>
      <section aria-labelledby="overall-progress" className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold" id="overall-progress">Overall progress</h2>
          <p className="mt-1 text-sm text-muted-foreground">Your latest accuracy by module.</p>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {activeModules.map((module) => <ModuleOverview key={module.module} module={module} />)}
        </div>
      </section>

      {strongest && needsWork ? (
        <section aria-labelledby="strengths" className="space-y-4">
          <h2 className="text-2xl font-semibold" id="strengths">Strengths and focus</h2>
          <div className="grid gap-5 rounded-lg border border-workspace-border bg-surface-lowest p-5 sm:grid-cols-2 sm:divide-x sm:divide-workspace-separator">
            <ModuleInsight label="Strongest area" module={strongest} />
            <div className="sm:pl-5"><ModuleInsight label="Needs work" module={needsWork} /></div>
          </div>
        </section>
      ) : (
        <section aria-labelledby="more-evidence" className="rounded-lg border border-workspace-border bg-surface-low p-5">
          <h2 className="font-semibold text-on-surface" id="more-evidence">Build a clearer picture</h2>
          <p className="mt-2 text-sm text-muted-foreground">Complete a few more sessions in another module to compare strengths and focus areas.</p>
        </section>
      )}

      <section aria-labelledby="next-best-practice" className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold" id="next-best-practice">Next best practice</h2>
          <p className="mt-1 text-sm text-muted-foreground">One focused step to take now.</p>
        </div>
        <Card className="border-primary bg-primary-muted">
          <CardHeader>
            <div className="flex items-start gap-3">
              <CheckCircle2 aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div>
                <CardTitle>{recommendation ? `${recommendation.difficulty[0].toUpperCase()}${recommendation.difficulty.slice(1)} ${recommendationModule?.label ?? "Core practice"}` : "Continue Core practice"}</CardTitle>
                <CardDescription className="mt-1">{recommendation?.skill ?? "Build enough history for a focused recommendation."}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-6 text-on-surface-variant">
              {recommendation ? "A short focused set will help improve this area." : "Complete a few more questions and your next focused step will appear here."}
            </p>
            <Button asChild className="mt-5 w-full sm:w-auto">
              <Link href={recommendation ? recommendation.href as Route : "/practice"}>
                Practice now <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      <DetailedBreakdown modules={activeModules} />
    </PageShell>
  );
}
