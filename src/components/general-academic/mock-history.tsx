import { ArrowRight, Clock3 } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { GeneralAcademicMockHistoryItem } from "@/lib/general-academic/mock-data";

export function GeneralAcademicMockHistory({ items }: { items: GeneralAcademicMockHistoryItem[] }) {
  if (!items.length) return <Card><CardContent className="p-8 text-center"><Clock3 className="mx-auto size-8 text-primary" /><h2 className="mt-3 text-lg font-semibold">No General Academic mocks yet</h2><p className="mt-2 text-sm text-muted-foreground">Completed and active PrepDMAT simulations will appear here.</p><Button asChild className="mt-5"><Link href="/mock/general-academic">Start a Mock</Link></Button></CardContent></Card>;
  return <div className="grid gap-4 md:grid-cols-2">{items.map((item) => <Card key={item.id}><CardHeader><div className="flex items-center justify-between gap-2"><Badge variant={item.status === "in_progress" ? "warning" : "success"}>{item.status === "in_progress" ? "In progress" : "Completed"}</Badge><span className="text-xs text-muted-foreground">{new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric" }).format(new Date(item.submittedAt ?? item.startedAt))}</span></div><CardTitle className="mt-3">General Academic Mock</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">{item.packCount} source packs · {item.questionCount} questions</p>{item.status === "submitted" ? <p className="mt-2 font-semibold">{item.correctCount} / {item.questionCount} · {Math.round(item.accuracy ?? 0)}%</p> : <p className="mt-2 font-semibold">Pack {item.currentPackIndex + 1} of {item.packCount}</p>}<Button asChild className="mt-4" variant={item.status === "in_progress" ? "default" : "outline"}><Link href={item.status === "in_progress" ? `/mock/general-academic/${item.id}` : `/mock/general-academic/${item.id}/results`}>{item.status === "in_progress" ? "Resume" : "View Results"}<ArrowRight className="size-4" /></Link></Button></CardContent></Card>)}</div>;
}
