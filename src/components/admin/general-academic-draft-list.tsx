"use client";

import { Eye, Pencil, ShieldCheck } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { GeneralAcademicDraftSummary } from "@/lib/general-academic/persistence";
import {
  GENERAL_ACADEMIC_DIFFICULTIES,
  GENERAL_ACADEMIC_DOMAINS,
  GENERAL_ACADEMIC_DOMAIN_LABELS,
  GENERAL_ACADEMIC_ORIGINS,
  GENERAL_ACADEMIC_REVIEW_STATUSES,
} from "@/lib/general-academic/registries";

const selectClass = "h-10 min-w-0 rounded-md border border-workspace-border bg-surface-lowest px-3 text-sm";

export function GeneralAcademicDraftList({ drafts }: { drafts: GeneralAcademicDraftSummary[] }) {
  const [domain, setDomain] = useState("all");
  const [difficulty, setDifficulty] = useState("all");
  const [status, setStatus] = useState("all");
  const [origin, setOrigin] = useState("all");
  const visible = useMemo(() => drafts.filter((draft) =>
    (domain === "all" || draft.domain === domain)
    && (difficulty === "all" || draft.difficulty === difficulty)
    && (status === "all" || draft.reviewStatus === status)
    && (origin === "all" || draft.origin === origin),
  ), [difficulty, domain, drafts, origin, status]);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Draft filters">
        <label className="grid gap-1 text-xs font-semibold">Domain<select className={selectClass} onChange={(event) => setDomain(event.target.value)} value={domain}><option value="all">All domains</option>{GENERAL_ACADEMIC_DOMAINS.map((value) => <option key={value} value={value}>{GENERAL_ACADEMIC_DOMAIN_LABELS[value]}</option>)}</select></label>
        <label className="grid gap-1 text-xs font-semibold">Difficulty<select className={selectClass} onChange={(event) => setDifficulty(event.target.value)} value={difficulty}><option value="all">All difficulties</option>{GENERAL_ACADEMIC_DIFFICULTIES.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
        <label className="grid gap-1 text-xs font-semibold">Review status<select className={selectClass} onChange={(event) => setStatus(event.target.value)} value={status}><option value="all">All statuses</option>{GENERAL_ACADEMIC_REVIEW_STATUSES.map((value) => <option key={value} value={value}>{value.replace(/_/g, " ")}</option>)}</select></label>
        <label className="grid gap-1 text-xs font-semibold">Origin<select className={selectClass} onChange={(event) => setOrigin(event.target.value)} value={origin}><option value="all">All origins</option>{GENERAL_ACADEMIC_ORIGINS.map((value) => <option key={value} value={value}>{value.replace(/_/g, " ")}</option>)}</select></label>
      </div>

      {visible.length ? (
        <div className="overflow-x-auto rounded-lg border border-workspace-border">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b border-workspace-border bg-surface-container text-muted-foreground"><tr><th className="px-4 py-3">Title</th><th className="px-4 py-3">Domain / topic</th><th className="px-4 py-3">Difficulty</th><th className="px-4 py-3">Origin</th><th className="px-4 py-3">Questions</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Updated</th><th className="px-4 py-3"><span className="sr-only">Actions</span></th></tr></thead>
            <tbody className="divide-y divide-workspace-separator bg-surface-lowest">{visible.map((draft) => (
              <tr key={draft.id}>
                <td className="px-4 py-3 font-semibold">{draft.title}</td>
                <td className="px-4 py-3"><span className="block">{GENERAL_ACADEMIC_DOMAIN_LABELS[draft.domain]}</span><span className="text-xs text-muted-foreground">{draft.topic}</span></td>
                <td className="px-4 py-3 capitalize">{draft.difficulty}</td>
                <td className="px-4 py-3">{draft.origin.replace(/_/g, " ")}</td>
                <td className="px-4 py-3">{draft.questionCount}</td>
                <td className="px-4 py-3"><Badge variant="subtle">{draft.reviewStatus.replace(/_/g, " ")}</Badge></td>
                <td className="px-4 py-3">{new Date(draft.updatedAt).toLocaleString("en")}</td>
                <td className="px-4 py-3"><div className="flex gap-2">{draft.reviewStatus === "draft" ? <Button asChild size="sm" variant="outline"><Link href={`/admin/general-academic/${draft.id}/edit` as Route}><Pencil className="size-4" /> Edit</Link></Button> : null}<Button asChild size="sm" variant={draft.reviewStatus === "draft" ? "ghost" : "outline"}><Link href={`/admin/general-academic/${draft.id}/review` as Route}>{draft.reviewStatus === "published" || draft.reviewStatus === "archived" ? <Eye className="size-4" /> : <ShieldCheck className="size-4" />} {draft.reviewStatus === "published" || draft.reviewStatus === "archived" ? "View" : "Review"}</Link></Button></div></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      ) : (
        <Card><CardContent className="p-6 text-sm text-muted-foreground">No General Academic packs match these filters.</CardContent></Card>
      )}
    </div>
  );
}
