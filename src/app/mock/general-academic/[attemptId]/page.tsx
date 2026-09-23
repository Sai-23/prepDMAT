import { notFound, redirect } from "next/navigation";

import { PageShell } from "@/components/layout/page-shell";
import { GeneralAcademicMockWorkspace } from "@/components/general-academic/mock-workspace";
import { requireUser } from "@/lib/auth/guards";
import { requireGeneralAcademicEnabled } from "@/lib/general-academic/feature-gate";
import { getGeneralAcademicMockAttempt } from "@/lib/general-academic/mock-data";

export default async function GeneralAcademicMockAttemptPage({ params }: PageProps<"/mock/general-academic/[attemptId]">) {
  const user = await requireUser();
  requireGeneralAcademicEnabled();
  const { attemptId } = await params;
  const attempt = await getGeneralAcademicMockAttempt(user.id, attemptId);
  if (!attempt) notFound();
  if (attempt.status === "submitted") redirect(`/mock/general-academic/${attempt.id}/results`);
  return <PageShell description="Complete source packs under one server-controlled 90-minute timer." eyebrow="PrepDMAT practice simulation" title="General Academic Mock"><GeneralAcademicMockWorkspace attempt={attempt} /></PageShell>;
}
