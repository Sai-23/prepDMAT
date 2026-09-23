import { GeneralAcademicReviewQueue, type GeneralAcademicReviewQueueItem } from "@/components/admin/general-academic-review-queue";
import { PageShell } from "@/components/layout/page-shell";
import { requireRole } from "@/lib/auth/guards";
import { getGeneralAcademicContentIntelligenceForAdmin } from "@/lib/general-academic/content-intelligence-data";

export default async function GeneralAcademicReviewQueuePage() {
  const { user, roles } = await requireRole(["admin"]);
  const { reviewQueue } = await getGeneralAcademicContentIntelligenceForAdmin(user.id);
  const items: GeneralAcademicReviewQueueItem[] = reviewQueue.map((item) => ({
    id: item.item.id,
    title: item.item.pack.title,
    domain: item.item.pack.domain,
    status: item.item.pack.review.status as GeneralAcademicReviewQueueItem["status"],
    priority: item.priority,
    ageDays: item.ageDays,
    blockingCount: item.blocking.length,
    warningCount: item.warnings.length,
    similarityCount: item.similarity.length,
    contributions: item.coverageContribution,
  }));
  return <PageShell admin description="Review deterministic priorities, then use the existing human-review lifecycle. Approval is always completed individually." eyebrow="General Academic · Content intelligence" roles={roles} title="Review queue"><GeneralAcademicReviewQueue items={items} /></PageShell>;
}
