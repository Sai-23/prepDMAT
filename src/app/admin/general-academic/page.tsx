import { FileJson2, Plus, Sparkles } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { GeneralAcademicDraftList } from "@/components/admin/general-academic-draft-list";
import { GeneralAcademicContentDashboard } from "@/components/admin/general-academic-content-dashboard";
import { PageShell } from "@/components/layout/page-shell";
import { ErrorState } from "@/components/shared/error-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/guards";
import { getGeneralAcademicContentIntelligenceForAdmin } from "@/lib/general-academic/content-intelligence-data";

export default async function GeneralAcademicAdminPage() {
  const { user, roles } = await requireRole(["admin"]);
  let drafts = null;
  let health = null;
  try {
    const intelligence = await getGeneralAcademicContentIntelligenceForAdmin(user.id);
    health = intelligence.health;
    drafts = intelligence.inventory
      .map((item) => ({ id: item.id, title: item.pack.title, domain: item.pack.domain, topic: item.pack.topic, difficulty: item.pack.difficulty, origin: item.pack.origin, reviewStatus: item.pack.review.status, questionCount: item.pack.questions.length, contentFingerprint: item.contentFingerprint, updatedAt: item.updatedAt }))
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .slice(0, 250);
  } catch {
    drafts = null;
    health = null;
  }

  return (
    <PageShell eyebrow="General Academic" title="General Academic Studio" description="Create, validate, review, approve and publish General Academic source packs through the controlled admin lifecycle." admin roles={roles}>
      <div className="space-y-6">
        {health ? <GeneralAcademicContentDashboard health={health} /> : <ErrorState title="Content intelligence unavailable" description="Confirm that the General Academic migrations have been applied, then try again." />}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <Card><CardHeader><CardTitle>Create source pack</CardTitle></CardHeader><CardContent className="space-y-4"><p className="text-sm leading-6 text-muted-foreground">Author a source, structured representations, and linked questions in the canonical editor.</p><Button asChild><Link href={"/admin/general-academic/new" as Route}><Plus className="size-4" /> Create source pack</Link></Button></CardContent></Card>
          <Card><CardHeader><CardTitle>Import JSON</CardTitle></CardHeader><CardContent className="space-y-4"><p className="text-sm leading-6 text-muted-foreground">Paste or upload provider-independent canonical JSON, validate it, then continue into the same editor.</p><Button asChild variant="secondary"><Link href={"/admin/general-academic/import" as Route}><FileJson2 className="size-4" /> Import JSON</Link></Button></CardContent></Card>
          <Card><CardHeader><CardTitle>Generate with AI</CardTitle></CardHeader><CardContent className="space-y-4"><p className="text-sm leading-6 text-muted-foreground">Optionally generate an ephemeral canonical pack, inspect it, then continue into the shared editor before saving.</p><Button asChild variant="secondary"><Link href={"/admin/general-academic/generate" as Route}><Sparkles className="size-4" /> Generate with AI</Link></Button></CardContent></Card>
        </div>
        <section className="space-y-3" aria-labelledby="gam-drafts-heading"><div><h2 className="text-xl font-semibold" id="gam-drafts-heading">Source-pack library</h2><p className="mt-1 text-sm text-muted-foreground">Up to 250 recently updated packs across every lifecycle state.</p></div>{drafts ? <GeneralAcademicDraftList drafts={drafts} /> : <ErrorState title="Library unavailable" description="Confirm that the General Academic migrations have been applied, then try again." />}</section>
      </div>
    </PageShell>
  );
}
