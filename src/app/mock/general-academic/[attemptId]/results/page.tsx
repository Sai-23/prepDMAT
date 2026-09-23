import { notFound } from "next/navigation";

import { PageShell } from "@/components/layout/page-shell";
import { GeneralAcademicMockResults } from "@/components/general-academic/mock-results";
import { requireUser } from "@/lib/auth/guards";
import { requireGeneralAcademicEnabled } from "@/lib/general-academic/feature-gate";
import { getGeneralAcademicLearningOverview } from "@/lib/general-academic/learning-data";
import { getGeneralAcademicMockReview } from "@/lib/general-academic/mock-data";

export default async function GeneralAcademicMockResultsPage({ params }: PageProps<"/mock/general-academic/[attemptId]/results">) {
  const user = await requireUser();
  requireGeneralAcademicEnabled();
  const { attemptId } = await params;
  const [review, learning] = await Promise.all([
    getGeneralAcademicMockReview(user.id, attemptId),
    getGeneralAcademicLearningOverview(user.id, false).catch(() => null),
  ]);
  if (!review) notFound();
  return <PageShell description="Transparent PrepDMAT practice performance. This is not an official dMAT score." eyebrow="Mock results" title="General Academic Mock"><GeneralAcademicMockResults recommendation={learning?.recommendations[0]} review={review} /></PageShell>;
}
