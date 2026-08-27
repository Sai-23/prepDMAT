import { ReviewQueue } from "@/components/admin/review-queue";
import { PageShell } from "@/components/layout/page-shell";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { getReviewQueue } from "@/lib/admin/data";
import { requireRole } from "@/lib/auth/guards";

export default async function ReviewQueuePage() {
  const { roles } = await requireRole(["reviewer", "admin"]);
  const isAdmin = roles.includes("admin");
  let questions = null;
  let loadError: string | null = null;

  try {
    questions = await getReviewQueue(isAdmin);
  } catch {
    loadError = "Unable to load the review queue.";
  }

  return (
    <PageShell
      eyebrow={isAdmin ? "Question bank" : "Review queue"}
      title={isAdmin ? "Published Core questions" : "Validate questions before publication"}
      description={isAdmin ? "Preview active questions and safely remove them from future Practice and Mock pools. Legacy unpublished questions remain available through the filters." : "Check content, answer validity, explanations, and formatting. Reviewer decisions are recorded with comments and an audit trail."}
      admin
      roles={roles}
    >
      {loadError || !questions ? (
        <ErrorState
          title="Review queue unavailable"
          description={loadError ?? "Unable to load the review queue."}
        />
      ) : questions.length === 0 ? (
        <EmptyState
          title={isAdmin ? "The active question bank is empty" : "The review queue is clear"}
          description={isAdmin ? "Validated generated questions will appear here as soon as they are published." : "Questions submitted for review will appear here."}
        />
      ) : (
        <ReviewQueue initialQuestions={questions} isAdmin={isAdmin} />
      )}
    </PageShell>
  );
}
