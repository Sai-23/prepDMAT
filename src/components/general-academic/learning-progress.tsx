import { ArrowRight, BarChart3, Target } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GENERAL_ACADEMIC_WEAK_MINIMUM_ATTEMPTS, type GeneralAcademicPracticeRecommendation } from "@/lib/general-academic/learning";
import type { GeneralAcademicLearningOverview } from "@/lib/general-academic/learning-data";
import { GENERAL_ACADEMIC_DOMAIN_LABELS, GENERAL_ACADEMIC_SKILL_LABELS } from "@/lib/general-academic/registries";

function recommendationTitle(recommendation: GeneralAcademicPracticeRecommendation) {
  if (recommendation.type === "skill") return `Practice ${GENERAL_ACADEMIC_SKILL_LABELS[recommendation.target]}`;
  if (recommendation.type === "domain") return `Try ${GENERAL_ACADEMIC_DOMAIN_LABELS[recommendation.target]}`;
  return "Continue mixed practice";
}

export function GeneralAcademicLearningProgress({ overview }: { overview: GeneralAcademicLearningOverview }) {
  const { analytics } = overview;
  const recommendation = overview.recommendations[0];
  if (!analytics.completedPacks) return <Card><CardContent className="p-8 text-center"><BarChart3 className="mx-auto size-9 text-primary" /><h2 className="mt-4 text-xl font-semibold">Complete a few General Academic source packs</h2><p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">Skill and domain trends will appear after submitted practice. One or two answers will never be labelled as a weakness.</p><Button asChild className="mt-5"><Link href="/practice/general-academic">Start GAM Practice <ArrowRight className="size-4" /></Link></Button></CardContent></Card>;
  return (
    <div className="space-y-7">
      <section aria-labelledby="gam-summary" className="space-y-3"><h2 className="text-xl font-semibold" id="gam-summary">General Academic summary</h2><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Metric label="Completed packs" value={analytics.completedPacks} /><Metric label="Questions answered" value={analytics.answered} /><Metric label="Overall accuracy" value={`${Math.round(analytics.accuracy)}%`} /><Metric label="Recent accuracy" value={`${Math.round(analytics.recentAccuracy)}%`} /></div><p className="text-xs text-muted-foreground">Accuracy uses all linked questions, including unanswered questions. Recent accuracy covers the latest five submitted packs.</p></section>
      {recommendation ? <Card className="border-primary bg-primary-muted"><CardHeader><div className="flex items-start gap-3"><Target className="mt-0.5 size-5 shrink-0 text-primary" /><div><CardTitle>{recommendationTitle(recommendation)}</CardTitle><p className="mt-1 text-sm text-muted-foreground">{recommendation.reason}</p></div></div></CardHeader><CardContent><Button asChild><Link href={recommendation.href}>Start Practice <ArrowRight className="size-4" /></Link></Button></CardContent></Card> : null}
      <section aria-labelledby="gam-skills" className="space-y-3"><div><h2 className="text-xl font-semibold" id="gam-skills">Skills</h2><p className="mt-1 text-sm text-muted-foreground">Needs-practice labels require at least {GENERAL_ACADEMIC_WEAK_MINIMUM_ATTEMPTS} linked questions.</p></div><div className="grid gap-3 lg:grid-cols-2">{analytics.skills.map((metric) => <Card key={metric.skill}><CardContent className="flex h-full flex-col gap-3 p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold">{GENERAL_ACADEMIC_SKILL_LABELS[metric.skill]}</h3><p className="mt-1 text-sm text-muted-foreground">{metric.correct} / {metric.attempted} correct · {Math.round(metric.accuracy)}%</p></div>{metric.isWeak ? <Badge variant="warning">Needs practice</Badge> : metric.attempted < GENERAL_ACADEMIC_WEAK_MINIMUM_ATTEMPTS ? <Badge variant="subtle">More practice needed</Badge> : <Badge variant="success">Building steadily</Badge>}</div>{metric.attempted < GENERAL_ACADEMIC_WEAK_MINIMUM_ATTEMPTS ? <p className="text-xs text-muted-foreground">More practice is needed for a reliable trend.</p> : null}<Button asChild className="mt-auto self-start" size="sm" variant="outline"><Link href={`/practice/general-academic?skill=${metric.skill}`}>Practice</Link></Button></CardContent></Card>)}</div></section>
      <section aria-labelledby="gam-domains" className="space-y-3"><h2 className="text-xl font-semibold" id="gam-domains">Domains</h2><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{analytics.domains.map((metric) => <Card key={metric.domain}><CardContent className="p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold">{GENERAL_ACADEMIC_DOMAIN_LABELS[metric.domain]}</h3><p className="mt-1 text-sm text-muted-foreground">{metric.correct} / {metric.attempted} correct · {Math.round(metric.accuracy)}%</p></div>{metric.isWeak ? <Badge variant="warning">Needs practice</Badge> : null}</div><Button asChild className="mt-3" size="sm" variant="ghost"><Link href={`/practice/general-academic?domain=${metric.domain}`}>Practice domain</Link></Button></CardContent></Card>)}</div></section>
      {overview.recent.length ? <section aria-labelledby="gam-recent"><h2 className="text-xl font-semibold" id="gam-recent">Recent activity</h2><ol className="mt-3 divide-y divide-workspace-separator rounded-lg border border-workspace-border bg-surface-lowest px-4">{overview.recent.slice(0, 5).map((activity) => <li className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between" key={activity.id}><span><strong className="block text-sm">{activity.title}</strong><span className="text-xs text-muted-foreground">{GENERAL_ACADEMIC_DOMAIN_LABELS[activity.domain]}</span></span><span className="text-sm font-semibold">{activity.correctCount ?? 0}/{activity.questionCount} correct</span></li>)}</ol></section> : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-lg border border-workspace-border bg-surface-lowest p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-semibold">{value}</p></div>;
}
