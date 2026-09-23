import { ArrowRight, Brain, RotateCcw } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { GeneralAcademicPracticeRecommendation } from "@/lib/general-academic/learning";
import type { GeneralAcademicMockReview } from "@/lib/general-academic/mock";
import { GENERAL_ACADEMIC_DOMAIN_LABELS, GENERAL_ACADEMIC_SKILL_LABELS } from "@/lib/general-academic/registries";

function duration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ${seconds % 60}s`;
}

export function GeneralAcademicMockResults({ review, recommendation }: { review: GeneralAcademicMockReview; recommendation?: GeneralAcademicPracticeRecommendation | null }) {
  return (
    <div className="space-y-6">
      <Card className="overflow-hidden"><div className="bg-primary p-7 text-primary-foreground sm:p-10"><Badge variant="subtle">PrepDMAT practice performance</Badge><h1 className="mt-3 text-3xl font-semibold">General Academic Mock</h1><p className="mt-4 text-5xl font-semibold">{Math.round(review.summary.accuracy)}%</p><p className="mt-2 opacity-90">{review.summary.correct} of {review.summary.total} correct · {duration(review.summary.timeUsedSeconds)} used</p></div><CardContent className="grid grid-cols-3 gap-3 p-5 text-center"><div><p className="text-2xl font-semibold">{review.summary.correct}</p><p className="text-xs text-muted-foreground">Correct</p></div><div><p className="text-2xl font-semibold">{review.summary.incorrect}</p><p className="text-xs text-muted-foreground">Incorrect</p></div><div><p className="text-2xl font-semibold">{review.summary.unanswered}</p><p className="text-xs text-muted-foreground">Unanswered</p></div></CardContent></Card>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap"><Button asChild><Link href={`/mock/general-academic/${review.attempt.id}/review`}>Review Answers <ArrowRight className="size-4" /></Link></Button>{review.summary.incorrect ? <Button asChild variant="outline"><Link href="/practice/general-academic/mistakes"><Brain className="size-4" /> Review Mistakes</Link></Button> : null}{recommendation && recommendation.type !== "mixed" ? <Button asChild variant="outline"><Link href={recommendation.href}>Practice Recommended {recommendation.type === "skill" ? "Skill" : "Domain"}</Link></Button> : null}<Button asChild variant="secondary"><Link href="/mock/general-academic"><RotateCcw className="size-4" /> Take Another Mock</Link></Button></div>
      <section aria-labelledby="pack-performance"><h2 className="text-xl font-semibold" id="pack-performance">Source-pack performance</h2><div className="mt-3 grid gap-3 md:grid-cols-2">{review.packs.map((pack, index) => <Card key={pack.packId}><CardHeader><CardTitle className="text-base">Pack {index + 1} · {pack.title}</CardTitle><p className="text-sm text-muted-foreground">{GENERAL_ACADEMIC_DOMAIN_LABELS[pack.domain]}</p></CardHeader><CardContent><strong>{pack.correct} / {pack.total}</strong> · {Math.round(pack.accuracy)}%</CardContent></Card>)}</div></section>
      <div className="grid gap-5 lg:grid-cols-2"><section aria-labelledby="domain-performance"><h2 className="text-xl font-semibold" id="domain-performance">Domains</h2><div className="mt-3 space-y-2">{review.domains.map((metric) => <Card key={metric.domain}><CardContent className="flex items-center justify-between p-4"><span>{GENERAL_ACADEMIC_DOMAIN_LABELS[metric.domain]}</span><strong>{metric.correct}/{metric.total} · {Math.round(metric.accuracy)}%</strong></CardContent></Card>)}</div></section><section aria-labelledby="skill-performance"><h2 className="text-xl font-semibold" id="skill-performance">Skills</h2><div className="mt-3 space-y-2">{review.skills.map((metric) => <Card key={metric.skill}><CardContent className="flex items-center justify-between gap-3 p-4"><span>{GENERAL_ACADEMIC_SKILL_LABELS[metric.skill]}</span><strong className="whitespace-nowrap">{metric.correct}/{metric.total} · {Math.round(metric.accuracy)}%</strong></CardContent></Card>)}</div></section></div>
      <p className="text-xs text-muted-foreground">These are transparent PrepDMAT practice metrics, not an official dMAT score, percentile, cutoff, or admission prediction.</p>
    </div>
  );
}
