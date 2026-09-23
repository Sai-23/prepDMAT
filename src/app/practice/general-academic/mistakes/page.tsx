import Link from "next/link";

import { GeneralAcademicLearningLibrary } from "@/components/general-academic/learning-library";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/guards";
import { requireGeneralAcademicEnabled } from "@/lib/general-academic/feature-gate";
import { getGeneralAcademicMistakes } from "@/lib/general-academic/learning-data";

export default async function GeneralAcademicMistakesPage() {
  const user = await requireUser();
  requireGeneralAcademicEnabled();
  const mistakes = await getGeneralAcademicMistakes(user.id, "all");
  return <PageShell eyebrow="General Academic" title="Mistake Review" description="Revisit answered mistakes with their complete source context and explanations.">{mistakes.length ? <GeneralAcademicLearningLibrary items={mistakes} kind="mistakes" /> : <Card><CardContent className="p-8 text-center"><h2 className="text-xl font-semibold">No active GAM mistakes</h2><p className="mt-2 text-sm text-muted-foreground">Incorrect answered questions will appear here after submitted practice. Unanswered questions are tracked in progress but not added as mistakes.</p><Button asChild className="mt-5"><Link href="/practice/general-academic">Practice GAM</Link></Button></CardContent></Card>}</PageShell>;
}
