import { notFound, redirect } from "next/navigation";

import { GeneralAcademicPracticeWorkspace } from "@/components/general-academic/practice-workspace";
import { PageShell } from "@/components/layout/page-shell";
import { requireUser } from "@/lib/auth/guards";
import { requireGeneralAcademicEnabled } from "@/lib/general-academic/feature-gate";
import { getGeneralAcademicPracticeAttempt } from "@/lib/general-academic/practice-data";

export default async function GeneralAcademicAttemptPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const user = await requireUser();
  requireGeneralAcademicEnabled();
  const { attemptId } = await params;
  const attempt = await getGeneralAcademicPracticeAttempt(user.id, attemptId);
  if (!attempt || attempt.status === "abandoned") notFound();
  if (attempt.status === "submitted") redirect(`/practice/general-academic/${attempt.id}/results`);
  return <PageShell eyebrow="General Academic" title={attempt.pack.title} description="Read the complete source and answer its linked questions. Feedback appears after submission."><GeneralAcademicPracticeWorkspace attempt={attempt} /></PageShell>;
}
