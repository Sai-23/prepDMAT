import { notFound } from "next/navigation";

import { GeneralAcademicLearningReview } from "@/components/general-academic/learning-review";
import { PageShell } from "@/components/layout/page-shell";
import { requireUser } from "@/lib/auth/guards";
import { requireGeneralAcademicEnabled } from "@/lib/general-academic/feature-gate";
import { getGeneralAcademicMistakeReview } from "@/lib/general-academic/learning-data";

export default async function GeneralAcademicMistakeReviewPage({ params }: PageProps<"/practice/general-academic/mistakes/[mistakeId]">) {
  const user = await requireUser();
  requireGeneralAcademicEnabled();
  const { mistakeId } = await params;
  const mistake = await getGeneralAcademicMistakeReview(user.id, mistakeId);
  if (!mistake) notFound();
  return <PageShell eyebrow="GAM mistake review" title={mistake.pack.title} description="Review the preserved source, your latest incorrect answer, and the canonical explanation."><GeneralAcademicLearningReview kind="mistake" record={mistake} /></PageShell>;
}
