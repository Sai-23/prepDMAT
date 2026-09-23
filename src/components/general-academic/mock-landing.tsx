"use client";

import { ArrowRight, Clock3, History, Play } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { startGeneralAcademicMockAction } from "@/app/mock/general-academic/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function GeneralAcademicMockLanding({ canStart, active }: { canStart: boolean; active: { id: string; packCount: number; questionCount: number } | null }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const start = () => startTransition(async () => {
    setError(null);
    const result = await startGeneralAcademicMockAction();
    if (!result.ok) { setError(result.message); return; }
    router.push(`/mock/general-academic/${result.attemptId}`);
  });
  return (
    <div className="space-y-5">
      <Card className="border-primary/40 bg-primary-muted"><CardHeader><div className="flex items-center gap-3"><span className="rounded-lg bg-surface-lowest p-3 text-primary"><Clock3 className="size-6" /></span><div><CardTitle>One shared 90-minute timer</CardTitle><CardDescription className="mt-1">This is a PrepDMAT practice simulation composed from complete published source packs. Pack and question counts depend on available reviewed content.</CardDescription></div></div></CardHeader><CardContent><ul className="grid gap-2 text-sm text-on-surface-variant sm:grid-cols-3"><li>Complete source-pack context</li><li>Answers saved automatically</li><li>Feedback after submission</li></ul></CardContent></Card>
      {active ? <Card><CardHeader><CardTitle>Mock in progress</CardTitle><CardDescription>{active.packCount} source packs · {active.questionCount} questions. The timer continues while you are away.</CardDescription></CardHeader><CardContent><Button asChild><Link href={`/mock/general-academic/${active.id}`}><Play className="size-4" /> Resume Mock</Link></Button></CardContent></Card> : canStart ? <Card><CardHeader><CardTitle>Ready for a full PrepDMAT mock</CardTitle><CardDescription>Enough published content is available to compose a source-aware simulation.</CardDescription></CardHeader><CardContent><Button disabled={pending} onClick={start}>{pending ? "Starting…" : "Start New Mock"}<ArrowRight className="size-4" /></Button>{error ? <p className="mt-3 text-sm text-error" role="alert">{error}</p> : null}</CardContent></Card> : <Card><CardHeader><CardTitle>More published content is needed</CardTitle><CardDescription>Not enough published General Academic source packs are currently available for a full PrepDMAT mock. Continue GAM Practice while more mock content is added.</CardDescription></CardHeader><CardContent><Button asChild><Link href="/practice/general-academic">Practice GAM <ArrowRight className="size-4" /></Link></Button></CardContent></Card>}
      <Button asChild variant="outline"><Link href="/mock/general-academic/history"><History className="size-4" /> Mock History</Link></Button>
    </div>
  );
}
