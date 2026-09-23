"use client";

import { Archive, CheckCircle2, RotateCcw, Send, ShieldCheck, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { startTransition, useRef, useState } from "react";

import { transitionGeneralAcademicPackAction, type GeneralAcademicLifecycleActionResult } from "@/app/admin/general-academic/lifecycle-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GENERAL_ACADEMIC_REVIEW_CHECKLIST, type GeneralAcademicReviewStatus } from "@/lib/general-academic/lifecycle";

const initialChecklist = Object.fromEntries(GENERAL_ACADEMIC_REVIEW_CHECKLIST.map(([key]) => [key, false])) as Record<(typeof GENERAL_ACADEMIC_REVIEW_CHECKLIST)[number][0], boolean>;

export function GeneralAcademicLifecyclePanel({ packId, status }: { packId: string; status: GeneralAcademicReviewStatus }) {
  const router = useRouter();
  const submitting = useRef(false);
  const [checklist, setChecklist] = useState(initialChecklist);
  const [notes, setNotes] = useState("");
  const [pending, setPending] = useState<GeneralAcademicReviewStatus | null>(null);
  const [result, setResult] = useState<GeneralAcademicLifecycleActionResult | null>(null);

  function transition(target: GeneralAcademicReviewStatus) {
    if (submitting.current) return;
    submitting.current = true;
    setPending(target);
    setResult(null);
    startTransition(async () => {
      try {
        const response = await transitionGeneralAcademicPackAction(packId, target, {
          notes,
          checklist: target === "approved" ? checklist : undefined,
        });
        setResult(response);
        if (response.ok) router.refresh();
      } finally {
        submitting.current = false;
        setPending(null);
      }
    });
  }

  const allChecked = Object.values(checklist).every(Boolean);
  return (
    <Card>
      <CardHeader><CardTitle>Human review and lifecycle</CardTitle><CardDescription>Transitions are re-authorized and revalidated against current server state. Warnings require judgement; blocking issues prevent progression.</CardDescription></CardHeader>
      <CardContent className="space-y-5">
        {status === "needs_review" ? <fieldset className="space-y-3"><legend className="font-semibold">Approval checklist</legend>{GENERAL_ACADEMIC_REVIEW_CHECKLIST.map(([key, label]) => <label className="flex min-h-11 items-start gap-3 rounded-md border border-workspace-border p-3 text-sm" key={key}><input checked={checklist[key]} className="mt-0.5 size-4" onChange={(event) => setChecklist((current) => ({ ...current, [key]: event.target.checked }))} type="checkbox" /><span>{label}</span></label>)}</fieldset> : null}
        {(status === "draft" || status === "needs_review" || status === "approved") ? <label className="grid gap-2 text-sm font-semibold">Review notes {status === "needs_review" ? "(required for rejection)" : "(optional)"}<textarea className="min-h-24 rounded-md border border-workspace-border bg-surface-lowest p-3 font-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" maxLength={5000} onChange={(event) => setNotes(event.target.value)} value={notes} /></label> : null}
        <div className="flex flex-wrap gap-2">
          {status === "draft" ? <Button disabled={Boolean(pending)} onClick={() => transition("needs_review")} type="button"><Send className="size-4" /> Submit for Review</Button> : null}
          {status === "needs_review" ? <><Button disabled={Boolean(pending)} onClick={() => transition("draft")} type="button" variant="outline"><RotateCcw className="size-4" /> Return to Draft</Button><Button disabled={Boolean(pending) || !notes.trim()} onClick={() => transition("rejected")} type="button" variant="destructive"><XCircle className="size-4" /> Reject</Button><Button disabled={Boolean(pending) || !allChecked} onClick={() => transition("approved")} type="button"><CheckCircle2 className="size-4" /> Approve</Button></> : null}
          {status === "approved" ? <><Button disabled={Boolean(pending)} onClick={() => transition("needs_review")} type="button" variant="outline"><RotateCcw className="size-4" /> Reopen Review</Button><Button disabled={Boolean(pending)} onClick={() => transition("published")} type="button"><ShieldCheck className="size-4" /> Publish</Button></> : null}
          {status === "rejected" ? <Button disabled={Boolean(pending)} onClick={() => transition("draft")} type="button"><RotateCcw className="size-4" /> Return to Draft</Button> : null}
          {status === "published" ? <Button disabled={Boolean(pending)} onClick={() => transition("archived")} type="button" variant="outline"><Archive className="size-4" /> Archive</Button> : null}
        </div>
        {pending ? <p aria-live="polite" className="text-sm text-muted-foreground">Updating lifecycle…</p> : null}
        {result ? <div aria-live="polite" className={`rounded-md border p-3 text-sm ${result.ok ? "border-success/30 bg-success-container" : "border-error/30 bg-error-container"}`}><strong>{result.message}</strong>{result.ok && result.duplicateTitles.length ? <p className="mt-1">Published duplicate: {result.duplicateTitles.join(", ")}. Nothing was overwritten.</p> : null}</div> : null}
      </CardContent>
    </Card>
  );
}
