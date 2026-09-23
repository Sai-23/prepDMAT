import { AlertTriangle, CheckCircle2, CircleDot } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GENERAL_ACADEMIC_SKILL_LABELS } from "@/lib/general-academic/registries";
import type { GeneralAcademicQualityResult } from "@/lib/general-academic/quality";

export function GeneralAcademicQualitySummary({ quality }: { quality: GeneralAcademicQualityResult }) {
  const verified = quality.metrics.answerVerification.filter((item) => item.status === "verified").length;
  const manual = quality.metrics.answerVerification.filter((item) => item.status === "manual").length;
  return (
    <Card aria-label="General Academic quality checks">
      <CardHeader className="flex-row items-center justify-between gap-3"><CardTitle>Quality checks</CardTitle><Badge variant={quality.blocking.length ? "warning" : "success"}>{quality.blocking.length} blocking · {quality.warnings.length} warnings</Badge></CardHeader>
      <CardContent className="space-y-5">
        <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div><dt className="text-muted-foreground">Structure</dt><dd className="font-semibold">{quality.validStructure ? "Valid" : "Invalid"}</dd></div>
          <div><dt className="text-muted-foreground">Questions</dt><dd className="font-semibold">{quality.metrics.questionCount}</dd></div>
          <div><dt className="text-muted-foreground">Deterministic answers</dt><dd className="font-semibold">{verified} verified · {manual} manual</dd></div>
          <div><dt className="text-muted-foreground">Math rendering</dt><dd className="font-semibold">{quality.metrics.math.rendered} rendered · {quality.metrics.math.fallback} fallback</dd></div>
          <div><dt className="text-muted-foreground">Representations</dt><dd>Text + {quality.metrics.representations.formula}F / {quality.metrics.representations.table}T / {quality.metrics.representations.graph}G / {quality.metrics.representations.figure}D</dd></div>
          <div><dt className="text-muted-foreground">Difficulty</dt><dd>{Object.entries(quality.metrics.difficulties).filter(([, count]) => count).map(([key, count]) => `${key}: ${count}`).join(" · ") || "None"}</dd></div>
          <div><dt className="text-muted-foreground">Answer positions</dt><dd>{Object.entries(quality.metrics.answerPositions).map(([key, count]) => `${key}: ${count}`).join(" · ")}</dd></div>
          <div><dt className="text-muted-foreground">Skills represented</dt><dd>{Object.values(quality.metrics.skills).filter(Boolean).length}</dd></div>
        </dl>
        <div className="grid gap-2 sm:grid-cols-2">{Object.entries(quality.metrics.skills).filter(([, count]) => count).map(([skill, count]) => <div className="flex justify-between rounded bg-surface-container px-3 py-2 text-sm" key={skill}><span>{GENERAL_ACADEMIC_SKILL_LABELS[skill as keyof typeof GENERAL_ACADEMIC_SKILL_LABELS]}</span><strong>{count}</strong></div>)}</div>
        {[...quality.blocking, ...quality.warnings].length ? <ul className="space-y-2">{[...quality.blocking, ...quality.warnings].map((finding, index) => <li className={`rounded-md border p-3 text-sm ${finding.severity === "blocking" ? "border-error/30 bg-error-container" : "border-warning/30 bg-warning-container"}`} key={`${finding.code}-${finding.path}-${index}`}>{finding.severity === "blocking" ? <AlertTriangle className="mr-2 inline size-4" /> : <CircleDot className="mr-2 inline size-4" />}<strong>{finding.code}</strong>: {finding.message}</li>)}</ul> : <p className="flex items-center gap-2 text-sm text-success"><CheckCircle2 className="size-4" /> No blocking issues or deterministic warnings.</p>}
      </CardContent>
    </Card>
  );
}
