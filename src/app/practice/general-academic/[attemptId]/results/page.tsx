import { notFound } from "next/navigation";

import { GeneralAcademicPracticeResults } from "@/components/general-academic/practice-results";
import { PageShell } from "@/components/layout/page-shell";
import { requireUser } from "@/lib/auth/guards";
import { requireGeneralAcademicEnabled } from "@/lib/general-academic/feature-gate";
import { getGeneralAcademicLearningOverview } from "@/lib/general-academic/learning-data";
import { getGeneralAcademicPracticeReview } from "@/lib/general-academic/practice-data";

export default async function GeneralAcademicResultsPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const user = await requireUser();
  requireGeneralAcademicEnabled();
  const { attemptId } = await params;
  const [review, overview] = await Promise.all([
    getGeneralAcademicPracticeReview(user.id, attemptId),
    getGeneralAcademicLearningOverview(user.id).catch(() => null),
  ]);
  if (!review) notFound();
  return <PageShell eyebrow="General Academic results" title="Practice complete" description="Review your source-pack performance and choose the next useful practice step."><GeneralAcademicPracticeResults activeMistakeCount={overview?.activeMistakeCount} recommendation={overview?.recommendations[0]} review={review} /></PageShell>;
}
