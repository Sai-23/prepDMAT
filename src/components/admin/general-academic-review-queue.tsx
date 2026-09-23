"use client";

import type { Route } from "next";
import Link from "next/link";
import { useState, useTransition } from "react";

import { bulkTransitionGeneralAcademicPacksAction } from "@/app/admin/general-academic/phase8-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export type GeneralAcademicReviewQueueItem = {
  id: string;
  title: string;
  domain: string;
  status: "draft" | "needs_review" | "approved";
  priority: number;
  ageDays: number;
  blockingCount: number;
  warningCount: number;
  similarityCount: number;
  contributions: string[];
};

function label(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

export function GeneralAcademicReviewQueue({ items }: { items: GeneralAcademicReviewQueueItem[] }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [details, setDetails] = useState<Array<{ id: string; ok: boolean; message: string }>>([]);

  function toggle(id: string, checked: boolean) {
    setSelected((current) => checked ? [...new Set([...current, id])] : current.filter((value) => value !== id));
  }

  function run(target: "needs_review" | "published") {
    if (!selected.length || pending) return;
    setMessage(null);
    setDetails([]);
    startTransition(async () => {
      const result = await bulkTransitionGeneralAcademicPacksAction({ packIds: selected, target });
      setMessage(result.message);
      setDetails(result.items);
      setSelected([]);
    });
  }

  return (
    <div className="space-y-5">
      <Card><CardHeader><CardTitle>Safe bulk actions</CardTitle><CardDescription>Each selected pack is checked independently. Approval is never available as a bulk action, and publishing still requires prior human approval.</CardDescription></CardHeader><CardContent className="flex flex-wrap items-center gap-3"><Button disabled={!selected.length || pending} onClick={() => run("needs_review")} type="button">Send drafts to review</Button><Button disabled={!selected.length || pending} onClick={() => run("published")} type="button" variant="outline">Publish approved packs</Button><span aria-live="polite" className="text-sm text-muted-foreground">{pending ? "Checking each pack…" : message ?? `${selected.length} selected`}</span></CardContent></Card>
      {details.length ? <ul className="space-y-2 text-sm">{details.map((item) => <li className={`rounded-md border p-3 ${item.ok ? "border-success/30 bg-success-container" : "border-warning/30 bg-warning-container"}`} key={item.id}><strong>{item.ok ? "Completed" : "Not changed"}:</strong> {item.message}</li>)}</ul> : null}
      <div className="space-y-3">
        {items.map((item, index) => <Card key={item.id}><CardHeader><div className="flex items-start gap-3"><input aria-label={`Select ${item.title}`} checked={selected.includes(item.id)} className="mt-1 size-4" disabled={pending} onChange={(event) => toggle(item.id, event.target.checked)} type="checkbox" /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><Badge variant="subtle">Priority {index + 1}</Badge><Badge variant="subtle">{label(item.status)}</Badge><CardTitle>{item.title}</CardTitle></div><CardDescription>{label(item.domain)} · waiting {item.ageDays} day{item.ageDays === 1 ? "" : "s"} · deterministic priority {item.priority}</CardDescription></div></div></CardHeader><CardContent className="space-y-3"><div className="flex flex-wrap gap-2 text-xs"><Badge variant={item.blockingCount ? "warning" : "success"}>{item.blockingCount} blocking</Badge><Badge variant="subtle">{item.warningCount} warnings</Badge><Badge variant="subtle">{item.similarityCount} similarity alerts</Badge></div>{item.contributions.length ? <p className="text-sm text-muted-foreground">Coverage contribution: {item.contributions.join(", ")}</p> : null}<Button asChild size="sm" variant="outline"><Link href={`/admin/general-academic/${item.id}/review` as Route}>Review individually</Link></Button></CardContent></Card>)}
        {!items.length ? <p className="rounded-lg border border-workspace-border bg-surface-container p-4 text-sm">No drafts, review items, or approved packs are waiting.</p> : null}
      </div>
    </div>
  );
}
