import { Activity, ClipboardCheck, FileSearch, Grid3X3, ListChecks } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { getGeneralAcademicInventoryHealth } from "@/lib/general-academic/content-intelligence";

type Health = ReturnType<typeof getGeneralAcademicInventoryHealth>;

function label(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

export function GeneralAcademicContentDashboard({ health }: { health: Health }) {
  const { coverage } = health.audit;
  const metrics = [
    ["Published packs", coverage.totals.publishedPacks],
    ["Published questions", coverage.totals.publishedQuestions],
    ["Draft packs", coverage.lifecycle.draft.packs],
    ["Needs review", coverage.lifecycle.needs_review.packs],
    ["Approved", coverage.lifecycle.approved.packs],
    ["Archived", coverage.lifecycle.archived.packs],
  ] as const;
  return (
    <div className="space-y-6">
      <section aria-labelledby="gam-inventory-heading" className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><h2 className="text-xl font-semibold" id="gam-inventory-heading">Content inventory</h2><p className="mt-1 text-sm text-muted-foreground">PrepDMAT internal inventory and pipeline status. These are not official dMAT distribution targets.</p></div>
          <Button asChild variant="outline"><a href="/admin/general-academic/report"><FileSearch className="size-4" /> Export CSV report</a></Button>
        </div>
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {metrics.map(([name, value]) => <div className="rounded-lg border border-workspace-border bg-surface-lowest p-4" key={name}><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{name}</dt><dd className="mt-2 text-2xl font-semibold">{value}</dd></div>)}
        </dl>
        <p className="text-sm text-muted-foreground">Average questions per published pack: <strong className="text-foreground">{coverage.totals.averageQuestionsPerPublishedPack}</strong></p>
      </section>

      <section aria-labelledby="gam-health-heading" className="space-y-3">
        <div><h2 className="text-xl font-semibold" id="gam-health-heading">Inventory health</h2><p className="mt-1 text-sm text-muted-foreground">Deterministic signals guide editorial work; human review remains authoritative.</p></div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card><CardHeader><CardTitle className="flex items-center justify-between gap-2">Overall <Badge variant={health.state === "healthy" ? "success" : "warning"}>{label(health.state)}</Badge></CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">{health.counts.blocking} blocking · {health.counts.warnings} warnings</CardContent></Card>
          <Card><CardHeader><CardTitle className="flex items-center justify-between gap-2">Mock readiness <Badge variant={health.readiness.mock.state === "ready" ? "success" : "warning"}>{label(health.readiness.mock.state)}</Badge></CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">Repeat resilience: {label(health.readiness.mock.repeatResilience)}</CardContent></Card>
          <Card><CardHeader><CardTitle>Review backlog</CardTitle></CardHeader><CardContent><p className="text-2xl font-semibold">{health.counts.reviewBacklog}</p><p className="text-sm text-muted-foreground">packs awaiting human review</p></CardContent></Card>
          <Card><CardHeader><CardTitle>Similarity alerts</CardTitle></CardHeader><CardContent><p className="text-2xl font-semibold">{health.counts.duplicateAlerts}</p><p className="text-sm text-muted-foreground">review signals, not automatic verdicts</p></CardContent></Card>
        </div>
        {health.readiness.mock.reasons.length ? <ul className="rounded-lg border border-warning/30 bg-warning-container p-4 text-sm"><li className="font-semibold">Mock-readiness notes</li>{health.readiness.mock.reasons.map((reason) => <li className="mt-1" key={reason}>• {reason}</li>)}</ul> : null}
      </section>

      <section aria-labelledby="gam-priorities-heading" className="space-y-3">
        <div><h2 className="text-xl font-semibold" id="gam-priorities-heading">Content priorities</h2><p className="mt-1 text-sm text-muted-foreground">Pipeline-aware recommendations explain what to do next and why.</p></div>
        <div className="grid gap-3 lg:grid-cols-2">
          {health.recommendations.slice(0, 6).map((item) => <Card key={item.id}><CardHeader><div className="flex flex-wrap items-center gap-2"><Badge variant="subtle">{item.type}</Badge><CardTitle>{item.title}</CardTitle></div><CardDescription>{item.reason}</CardDescription></CardHeader><CardContent className="flex flex-wrap items-center gap-2 text-xs">{item.domain ? <Badge variant="subtle">{label(item.domain)}</Badge> : null}{item.skill ? <Badge variant="subtle">{label(item.skill)}</Badge> : null}{item.difficulty ? <Badge variant="subtle">PrepDMAT {label(item.difficulty)}</Badge> : null}{item.representations?.map((value) => <Badge key={value} variant="subtle">{label(value)}</Badge>)}<Button asChild className="ml-auto" size="sm" variant="outline">{item.type === "FIX" ? <Link href={"/admin/general-academic/quality" as Route}>Inspect issues</Link> : item.type === "REVIEW" || item.type === "PUBLISH" ? <Link href={"/admin/general-academic/review" as Route}>Open queue</Link> : <Link href={{ pathname: "/admin/general-academic/generate", query: { domain: item.domain, skill: item.skill, difficulty: item.difficulty, representation: item.representations?.find((value) => value !== "text") } }}>Generate drafts</Link>}</Button></CardContent></Card>)}
          {!health.recommendations.length ? <p className="rounded-lg border border-workspace-border bg-surface-container p-4 text-sm">No urgent content priorities were detected.</p> : null}
        </div>
      </section>

      <section aria-label="Content intelligence tools" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card><CardHeader><Grid3X3 className="size-5 text-primary" /><CardTitle>Coverage</CardTitle><CardDescription>Inspect domain, skill, difficulty and representation matrices.</CardDescription></CardHeader><CardContent><Button asChild variant="outline"><Link href={"/admin/general-academic/coverage" as Route}>Open coverage</Link></Button></CardContent></Card>
        <Card><CardHeader><Activity className="size-5 text-primary" /><CardTitle>Quality audit</CardTitle><CardDescription>Review validation, answer patterns and similarity alerts.</CardDescription></CardHeader><CardContent><Button asChild variant="outline"><Link href={"/admin/general-academic/quality" as Route}>Open quality</Link></Button></CardContent></Card>
        <Card><CardHeader><ListChecks className="size-5 text-primary" /><CardTitle>Review queue</CardTitle><CardDescription>Work through deterministic priorities and safe bulk transitions.</CardDescription></CardHeader><CardContent><Button asChild variant="outline"><Link href={"/admin/general-academic/review" as Route}>Open queue</Link></Button></CardContent></Card>
        <Card><CardHeader><ClipboardCheck className="size-5 text-primary" /><CardTitle>Practice readiness</CardTitle><CardDescription>Missing domain cells: {Object.values(health.readiness.practice.domains).filter((value) => value === "missing").length}. Missing skills: {Object.values(health.readiness.practice.skills).filter((value) => value === "missing").length}.</CardDescription></CardHeader><CardContent><Badge variant={health.readiness.practice.mixed === "good" ? "success" : "warning"}>{label(health.readiness.practice.mixed)}</Badge></CardContent></Card>
      </section>
    </div>
  );
}
