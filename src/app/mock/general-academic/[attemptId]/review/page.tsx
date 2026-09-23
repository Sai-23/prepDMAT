import { notFound } from "next/navigation";

import { PageShell } from "@/components/layout/page-shell";
import { GeneralAcademicMockDetailedReview } from "@/components/general-academic/mock-review";
import { requireUser } from "@/lib/auth/guards";
import { requireGeneralAcademicEnabled } from "@/lib/general-academic/feature-gate";
import { getGeneralAcademicMockLearningState } from "@/lib/general-academic/learning-data";
import { getGeneralAcademicMockReview } from "@/lib/general-academic/mock-data";

export default async function GeneralAcademicMockReviewPage({ params }: PageProps<"/mock/general-academic/[attemptId]/review">) {
  const user = await requireUser();
  requireGeneralAcademicEnabled();
  const { attemptId } = await params;
  const [review, learning] = await Promise.all([
    getGeneralAcademicMockReview(user.id, attemptId),
    getGeneralAcademicMockLearningState(user.id, attemptId),
  ]);
  if (!review || !learning) notFound();
  return <PageShell description="Review each answer with its complete source context and canonical explanation." eyebrow="Source-aware review" title="General Academic Mock"><GeneralAcademicMockDetailedReview bookmarkKeys={learning.bookmarkKeys} mistakeKeys={learning.mistakes.filter((item) => item.status === "active").map((item) => item.key)} review={review} /></PageShell>;
}
