import Link from "next/link";

import { GeneralAcademicLearningProgress } from "@/components/general-academic/learning-progress";
import { PageShell } from "@/components/layout/page-shell";
import { ErrorState } from "@/components/shared/error-state";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/guards";
import { requireGeneralAcademicEnabled } from "@/lib/general-academic/feature-gate";
import { getGeneralAcademicLearningOverview } from "@/lib/general-academic/learning-data";

export default async function GeneralAcademicProgressPage() {
  const user = await requireUser();
  requireGeneralAcademicEnabled();
  const navigation = <nav aria-label="Progress areas" className="flex flex-wrap gap-2"><Button asChild variant="outline"><Link href="/progress">Core progress</Link></Button><Button aria-current="page" variant="secondary">General Academic progress</Button></nav>;
  let overview = null;
  try {
    overview = await getGeneralAcademicLearningOverview(user.id);
  } catch {
    overview = null;
  }
  return <PageShell eyebrow="Progress" title="General Academic progress" description="Transparent performance across completed source-pack practice.">{navigation}{overview ? <GeneralAcademicLearningProgress overview={overview} /> : <ErrorState title="General Academic progress is unavailable" description="Your saved attempts have not been changed. Try again shortly." />}</PageShell>;
}
