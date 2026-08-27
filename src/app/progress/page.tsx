import { ArrowRight, BarChart3, Info, Target, TrendingDown, TrendingUp } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { PageShell } from "@/components/layout/page-shell";
import { ErrorState } from "@/components/shared/error-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/guards";
import { getCoreProgress } from "@/lib/progress/data";
import type { Confidence, DifficultyMetric, ModuleProgress, PerformanceStatus, ProgressMetric, Trend } from "@/lib/progress/model";

const confidenceLabels: Record<Confidence, string> = {
  insufficient_data: "Insufficient data",
  early_estimate: "Early estimate",
  growing_confidence: "Growing confidence",
  reliable_estimate: "Reliable estimate",
};
const statusLabels: Record<PerformanceStatus, string> = {
  needs_attention: "Needs attention",
  developing: "Developing",
  stable: "Stable",
  strong: "Strong",
  insufficient_data: "Insufficient data",
};
const trendLabels: Record<Trend, string> = {
  improving: "Improving",
  stable: "Stable",
  declining: "Declining",
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

function DifficultyRow({ label, metric }: { label: string; metric: DifficultyMetric }) {
  return (
    <div className="grid grid-cols-[5rem_1fr_auto] items-center gap-3 text-sm">
      <span className="font-medium">{label}</span>
      <div aria-label={`${label}: ${pct(metric.accuracy)} from ${metric.attempts} questions`} className="h-2 overflow-hidden rounded-full bg-surface-container" role="img">
        <div className="h-full rounded-full bg-primary" style={{ width: `${metric.accuracy ?? 0}%` }} />
      </div>
      <span className="min-w-24 text-right text-muted-foreground">{metric.attempts ? `${pct(metric.accuracy)} · ${metric.attempts}` : "No data"}</span>
    </div>
  );
}

function ModuleCard({ module }: { module: ModuleProgress }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div><CardTitle>{module.label}</CardTitle><CardDescription>{module.attemptCount} answered questions</CardDescription></div>
          <Badge variant="subtle">{confidenceLabels[module.confidence]}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div><p className="text-sm text-muted-foreground">Lifetime accuracy</p><p className="mt-1 text-3xl font-semibold">{pct(module.accuracy)}</p></div>
          <Badge variant={badgeVariant(module.trend)}><TrendIcon trend={module.trend} /> {trendLabels[module.trend]}</Badge>
        </div>
        <div className="grid grid-cols-2 gap-3 border-t border-workspace-separator pt-4 text-sm">
          <div><p className="text-muted-foreground">Recent</p><p className="font-semibold">{pct(module.recentAccuracy)}</p></div>
          <div><p className="text-muted-foreground">Median time</p><p className="font-semibold">{seconds(module.medianResponseTime)}</p></div>
        </div>
      </CardContent>
    </Card>
  );
}

function SourceComparison({ metric }: { metric: ProgressMetric }) {
  const practice = metric.sourceMix.practice;
  const generated = metric.sourceMix.generated_mock;
  const curated = metric.sourceMix.curated_mock;
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {[["Practice", practice], ["Generated mocks", generated], ["Curated mocks", curated]].map(([label, value]) => {
        const row = value as DifficultyMetric;
        return <div className="rounded-md bg-surface-low p-3" key={label as string}><p className="text-xs text-muted-foreground">{label as string}</p><p className="mt-1 font-semibold">{row.attempts ? pct(row.accuracy) : "No data"}</p><p className="text-xs text-muted-foreground">{row.attempts} questions</p></div>;
      })}
    </div>
  );
}

export default async function ProgressPage() {
  const user = await requireUser();
  let progress;
  try {
    progress = await getCoreProgress(user.id);
  } catch {
    return <PageShell eyebrow="Core progress" title="How am I doing?" description="Progress from completed Core practice and assessments."><ErrorState title="Progress unavailable" description="We could not load your progress. Try again shortly." /></PageShell>;
  }

  if (progress.totalQuestions === 0) {
    return (
      <PageShell eyebrow="Core progress" title="How am I doing?" description="Progress starts with real answers—not placeholder scores.">
        <Card className="mx-auto max-w-2xl"><CardContent className="p-8 text-center sm:p-12"><Target aria-hidden="true" className="mx-auto h-10 w-10 text-primary" /><h2 className="mt-5 text-2xl font-semibold">Complete your first practice session</h2><p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-muted-foreground">Answer a short validated Core set to begin tracking accuracy, timing, difficulty, and reasoning skills.</p><Button asChild className="mt-6"><Link href="/practice">Start Practice <ArrowRight aria-hidden="true" className="h-4 w-4" /></Link></Button></CardContent></Card>
      </PageShell>
    );
  }

  const measurableSkills = progress.modules.flatMap((module) => module.skills).filter((skill) => skill.attemptCount >= 3);
  return (
    <PageShell eyebrow="Core progress" title="How am I doing?" description={`${progress.totalQuestions} real answered questions across completed practice and assessments.`}>
      <section aria-labelledby="core-overview" className="space-y-4">
        <div><h2 className="text-2xl font-semibold" id="core-overview">Core overview</h2><p className="mt-1 text-sm text-muted-foreground">Module results retain their practice or mock context.</p></div>
        <div className="grid gap-4 lg:grid-cols-3">{progress.modules.map((module) => <ModuleCard key={module.module} module={module} />)}</div>
      </section>

      <section aria-labelledby="practice-next" className="space-y-4">
        <div><h2 className="text-2xl font-semibold" id="practice-next">What to practice next</h2><p className="mt-1 text-sm text-muted-foreground">Deterministic recommendations from measured weaknesses and early signals.</p></div>
        {progress.recommendations.length ? <div className="grid gap-4 lg:grid-cols-3">{progress.recommendations.map((item) => <Card key={item.skillId}><CardHeader><div className="flex items-start justify-between gap-3"><CardTitle>{item.skill}</CardTitle><Badge variant={item.priority === "high" ? "warning" : "subtle"}>{item.priority} priority</Badge></div><CardDescription>{item.questionCount} {item.difficulty} {progress.modules.find((module) => module.module === item.module)?.label} questions</CardDescription></CardHeader><CardContent><p className="text-sm leading-6 text-muted-foreground">{item.reason}</p><Button asChild className="mt-5 w-full"><Link href={item.href as Route}>Practice this skill <ArrowRight aria-hidden="true" className="h-4 w-4" /></Link></Button></CardContent></Card>)}</div> : <Card><CardContent className="p-6"><p className="font-semibold">No weak area is measurable yet</p><p className="mt-2 text-sm text-muted-foreground">Complete at least six relevant questions for a confident focus recommendation. Early estimates appear after three.</p><Button asChild className="mt-4" variant="secondary"><Link href="/practice">Continue Practice</Link></Button></CardContent></Card>}
      </section>

      <section aria-labelledby="weak-areas" className="space-y-4">
        <div><h2 className="text-2xl font-semibold" id="weak-areas">Weak areas</h2><p className="mt-1 text-sm text-muted-foreground">Only skills with enough evidence and more than one weakness signal appear here.</p></div>
        {progress.weakAreas.length ? <div className="grid gap-4 md:grid-cols-2">{progress.weakAreas.map((skill) => <Card key={skill.skillId}><CardContent className="p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-semibold">{skill.label}</p><p className="text-sm text-muted-foreground">{progress.modules.find((module) => module.module === skill.module)?.label}</p></div><Badge variant="warning">Needs attention</Badge></div><div className="mt-4 grid grid-cols-3 gap-3 text-sm"><div><p className="text-muted-foreground">Recent</p><p className="font-semibold">{pct(skill.recentAccuracy)}</p></div><div><p className="text-muted-foreground">Questions</p><p className="font-semibold">{skill.attemptCount}</p></div><div><p className="text-muted-foreground">Trend</p><p className="font-semibold">{trendLabels[skill.trend]}</p></div></div></CardContent></Card>)}</div> : <p className="rounded-md border border-workspace-border bg-surface-low p-5 text-sm text-muted-foreground">No meaningful weak area is currently supported by your evidence.</p>}
      </section>

      <section aria-labelledby="skill-breakdown" className="space-y-4">
        <div><h2 className="text-2xl font-semibold" id="skill-breakdown">Skill breakdown</h2><p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground"><Info aria-hidden="true" className="h-4 w-4" /> One multi-skill answer carries a total contribution of one; raw relevant-question counts remain visible.</p></div>
        <div className="space-y-5">{progress.modules.map((module) => <Card key={module.module}><CardHeader><CardTitle>{module.label}</CardTitle><CardDescription>Student-facing reasoning skills supported by generator evidence.</CardDescription></CardHeader><CardContent>{module.skills.some((skill) => skill.attemptCount >= 3) ? <div className="divide-y divide-workspace-separator">{module.skills.filter((skill) => skill.attemptCount >= 3).map((skill) => <div className="grid gap-3 py-4 first:pt-0 sm:grid-cols-[1fr_auto_auto] sm:items-center" key={skill.skillId}><div><p className="font-semibold">{skill.label}</p><p className="text-xs text-muted-foreground">{skill.attemptCount} relevant questions · {confidenceLabels[skill.confidence]}</p></div><p className="text-sm"><span className="text-muted-foreground">Recent </span><strong>{pct(skill.recentAccuracy)}</strong></p><Badge variant={badgeVariant(skill.status)}>{statusLabels[skill.status]}</Badge></div>)}</div> : <p className="text-sm text-muted-foreground">Practice this module to reveal its skill breakdown.</p>}</CardContent></Card>)}</div>
      </section>

      <section aria-labelledby="difficulty-history" className="grid gap-5 xl:grid-cols-2">
        <Card><CardHeader><CardTitle id="difficulty-history">Difficulty breakdown</CardTitle><CardDescription>Hard results are tracked separately and receive modest transparent credit in normalized estimates.</CardDescription></CardHeader><CardContent className="space-y-6">{progress.modules.map((module) => <div className="space-y-3" key={module.module}><h3 className="font-semibold">{module.label}</h3><DifficultyRow label="Easy" metric={module.difficultyMix.easy} /><DifficultyRow label="Medium" metric={module.difficultyMix.medium} /><DifficultyRow label="Hard" metric={module.difficultyMix.hard} /></div>)}</CardContent></Card>
        <Card><CardHeader><CardTitle>Practice vs mock</CardTitle><CardDescription>Context only; differences are not treated as proof without enough questions.</CardDescription></CardHeader><CardContent className="space-y-5">{progress.modules.map((module) => <div className="space-y-2" key={module.module}><h3 className="font-semibold">{module.label}</h3><SourceComparison metric={module} /></div>)}</CardContent></Card>
      </section>

      <section aria-labelledby="recent-trend" className="space-y-4">
        <div><h2 className="text-2xl font-semibold" id="recent-trend">Recent trend</h2><p className="mt-1 text-sm text-muted-foreground">Session aggregates avoid misleading daily lines. A trend needs at least 12 answers across four sessions.</p></div>
        <div className="grid gap-5 lg:grid-cols-3">{progress.modules.map((module) => <Card key={module.module}><CardHeader><CardTitle>{module.label}</CardTitle><CardDescription>{trendLabels[module.trend]}</CardDescription></CardHeader><CardContent>{module.recentSessions.length ? <ol aria-label={`${module.label} recent sessions`} className="space-y-3">{module.recentSessions.map((session) => <li className="grid grid-cols-[1fr_auto] gap-3 text-sm" key={session.sessionId}><span className="text-muted-foreground">{new Intl.DateTimeFormat("en", { day: "numeric", month: "short" }).format(new Date(session.answeredAt))} · {session.attempts} questions</span><strong>{Math.round(session.accuracy)}%</strong></li>)}</ol> : <p className="text-sm text-muted-foreground">No completed sessions.</p>}</CardContent></Card>)}</div>
      </section>

      <section aria-labelledby="detailed-history">
        <Card><CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-xl font-semibold" id="detailed-history">Detailed history</h2><p className="mt-1 text-sm text-muted-foreground">Open completed mock results and question-by-question reviews without mixing them into practice mode.</p></div><Button asChild variant="secondary"><Link href="/results">View Results <ArrowRight aria-hidden="true" className="h-4 w-4" /></Link></Button></CardContent></Card>
      </section>

      <Card><CardHeader><CardTitle>How these estimates work</CardTitle></CardHeader><CardContent className="grid gap-4 text-sm leading-6 text-muted-foreground md:grid-cols-3"><p><strong className="text-on-surface">Recent and lifetime:</strong> the latest four sessions contribute at most five answers each to the recent view; older answers remain in lifetime history.</p><p><strong className="text-on-surface">Confidence:</strong> 0–2 is insufficient, 3–5 is early, 6–11 is growing, and 12+ is reliable.</p><p><strong className="text-on-surface">Timing:</strong> speed is interpreted with correctness and the question’s expected pace, never as good or bad by itself.</p></CardContent></Card>

      {!measurableSkills.length ? <p className="text-center text-sm text-muted-foreground">You have activity, but not yet enough repeated skill evidence for detailed conclusions.</p> : null}
    </PageShell>
  );
}
