import { Pencil } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { GeneralAcademicLifecyclePanel } from "@/components/admin/general-academic-lifecycle-panel";
import { GeneralAcademicPreview } from "@/components/admin/general-academic-preview";
import { GeneralAcademicQualitySummary } from "@/components/admin/general-academic-quality-summary";
import { PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/guards";
import { fetchGeneralAcademicPackForAdmin } from "@/lib/general-academic/persistence";
import { evaluateGeneralAcademicPackQuality } from "@/lib/general-academic/quality";
import { GENERAL_ACADEMIC_DOMAIN_LABELS, GENERAL_ACADEMIC_SKILL_LABELS } from "@/lib/general-academic/registries";

export default async function ReviewGeneralAcademicPackPage({ params }: { params: Promise<{ id: string }> }) {
  const { user, roles } = await requireRole(["admin"]);
  const { id } = await params;
  const stored = await fetchGeneralAcademicPackForAdmin(id, user.id);
  if (!stored) notFound();
  const quality = evaluateGeneralAcademicPackQuality(stored.pack);
  const representations = ["Text", stored.pack.stimulus.formulas.length ? "Formula" : null, stored.pack.stimulus.tables.length ? "Table" : null, stored.pack.stimulus.graphs.length ? "Graph" : null, stored.pack.stimulus.figures.length ? "Figure" : null].filter(Boolean).join(" + ");
  const skills = [...new Set(stored.pack.questions.map((question) => GENERAL_ACADEMIC_SKILL_LABELS[question.skill]))];
  return (
    <PageShell admin description="Deterministic checks support — but never replace — accountable human academic review." eyebrow="General Academic review" roles={roles} title={stored.pack.title}>
      <div className="space-y-6">
        <Card><CardContent className="space-y-4 p-5"><div className="flex flex-wrap items-center gap-2"><Badge>{stored.pack.review.status.replaceAll("_", " ")}</Badge><Badge variant="subtle">{GENERAL_ACADEMIC_DOMAIN_LABELS[stored.pack.domain]}</Badge><Badge variant="subtle">{stored.pack.difficulty}</Badge>{stored.pack.review.status === "draft" ? <Button asChild size="sm" variant="outline"><Link href={`/admin/general-academic/${stored.id}/edit` as Route}><Pencil className="size-4" /> Edit draft</Link></Button> : null}</div><dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4"><div><dt className="text-muted-foreground">Topic</dt><dd>{stored.pack.topic}</dd></div><div><dt className="text-muted-foreground">Origin</dt><dd>{stored.pack.origin.replaceAll("_", " ")}</dd></div><div><dt className="text-muted-foreground">Provider / route</dt><dd>{stored.pack.sourceMeta.provider || "Not supplied"} / {stored.pack.sourceMeta.model || "Not supplied"}</dd></div><div><dt className="text-muted-foreground">Questions</dt><dd>{stored.pack.questions.length}</dd></div><div><dt className="text-muted-foreground">Representations</dt><dd>{representations}</dd></div><div><dt className="text-muted-foreground">Skills</dt><dd>{skills.join(", ")}</dd></div><div className="min-w-0"><dt className="text-muted-foreground">Fingerprint</dt><dd className="truncate font-mono text-xs">{stored.contentFingerprint}</dd></div><div><dt className="text-muted-foreground">Updated</dt><dd>{new Date(stored.updatedAt).toLocaleString("en")}</dd></div></dl>{stored.pack.review.notes ? <p className="rounded bg-surface-container p-3 text-sm"><strong>Review notes:</strong> {stored.pack.review.notes}</p> : null}<dl className="grid gap-3 text-xs text-muted-foreground sm:grid-cols-3"><div><dt>Reviewed</dt><dd>{stored.lifecycle.reviewedAt ? new Date(stored.lifecycle.reviewedAt).toLocaleString("en") : "Not yet"}</dd><dd className="truncate font-mono">{stored.lifecycle.reviewedBy ?? "No actor"}</dd></div><div><dt>Approved</dt><dd>{stored.lifecycle.approvedAt ? new Date(stored.lifecycle.approvedAt).toLocaleString("en") : "Not yet"}</dd><dd className="truncate font-mono">{stored.lifecycle.approvedBy ?? "No actor"}</dd></div><div><dt>Published</dt><dd>{stored.lifecycle.publishedAt ? new Date(stored.lifecycle.publishedAt).toLocaleString("en") : "Not yet"}</dd><dd className="truncate font-mono">{stored.lifecycle.publishedBy ?? "No actor"}</dd></div></dl></CardContent></Card>
        <GeneralAcademicQualitySummary quality={quality} />
        <GeneralAcademicLifecyclePanel packId={stored.id} status={stored.pack.review.status} />
        <GeneralAcademicPreview pack={stored.pack} quality={quality} />
      </div>
    </PageShell>
  );
}
