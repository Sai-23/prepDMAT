import { notFound } from "next/navigation";

import { GeneralAcademicLearningReview } from "@/components/general-academic/learning-review";
import { PageShell } from "@/components/layout/page-shell";
import { requireUser } from "@/lib/auth/guards";
import { requireGeneralAcademicEnabled } from "@/lib/general-academic/feature-gate";
import { getGeneralAcademicBookmarkReview } from "@/lib/general-academic/learning-data";

export default async function GeneralAcademicBookmarkReviewPage({ params }: PageProps<"/practice/general-academic/bookmarks/[bookmarkId]">) {
  const user = await requireUser();
  requireGeneralAcademicEnabled();
  const { bookmarkId } = await params;
  const bookmark = await getGeneralAcademicBookmarkReview(user.id, bookmarkId);
  if (!bookmark) notFound();
  return <PageShell eyebrow="GAM bookmark" title={bookmark.pack.title} description="The preserved source and question from your completed practice."><GeneralAcademicLearningReview kind="bookmark" record={bookmark} /></PageShell>;
}
