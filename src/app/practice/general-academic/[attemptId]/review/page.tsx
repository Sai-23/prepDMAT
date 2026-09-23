import { notFound } from "next/navigation";

import { GeneralAcademicDetailedReview } from "@/components/general-academic/practice-results";
import { PageShell } from "@/components/layout/page-shell";
import { requireUser } from "@/lib/auth/guards";
import { requireGeneralAcademicEnabled } from "@/lib/general-academic/feature-gate";
import { getGeneralAcademicAttemptLearningState } from "@/lib/general-academic/learning-data";
import { getGeneralAcademicPracticeReview } from "@/lib/general-academic/practice-data";

export default async function GeneralAcademicReviewPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const user = await requireUser();
  requireGeneralAcademicEnabled();
  const { attemptId } = await params;
  const [review, learningState] = await Promise.all([
    getGeneralAcademicPracticeReview(user.id, attemptId),
    getGeneralAcademicAttemptLearningState(user.id, attemptId).catch(() => null),
  ]);
  if (!review) notFound();
  return <PageShell eyebrow="General Academic review" title={review.attempt.pack.title} description="Compare your answers with the preserved source and canonical explanations."><GeneralAcademicDetailedReview bookmarkQuestionIds={learningState?.bookmarkQuestionIds} mistakeQuestionIds={learningState?.mistakes.filter((mistake) => mistake.status === "active").map((mistake) => mistake.questionId)} review={review} /></PageShell>;
}
