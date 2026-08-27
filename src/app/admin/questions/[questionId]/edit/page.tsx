import { notFound } from "next/navigation";

import { QuestionForm } from "@/components/admin/question-form";
import { DeleteQuestionButton } from "@/components/admin/delete-question-button";
import { PageShell } from "@/components/layout/page-shell";
import { ErrorState } from "@/components/shared/error-state";
import { getEditableQuestion } from "@/lib/admin/data";
import { questionEditIdSchema } from "@/lib/admin/schemas";
import { requireRole } from "@/lib/auth/guards";

export default async function QuestionEditPage({
  params,
}: {
  params: Promise<{ questionId: string }>;
}) {
  const { roles } = await requireRole(["admin"]);
  const parsed = questionEditIdSchema.safeParse((await params).questionId);
  if (!parsed.success) notFound();

  let question = null;
  let loadError: string | null = null;
  try {
    question = await getEditableQuestion(parsed.data);
  } catch {
    loadError = "Unable to load this question.";
  }
  if (!loadError && !question) notFound();
  const isPublished = question?.publicationStatus === "published";

  return (
    <PageShell
      eyebrow="Question editor"
      title={
        isPublished
          ? "Correct the published question"
          : "Revise and resubmit the question"
      }
      description={
        isPublished
          ? "Fix the live question while preserving a version snapshot and a complete administrator audit trail."
          : "Update the content after review feedback, preserve a version snapshot, and save it as a draft or send it back for review."
      }
      admin
      roles={roles}
    >
      {loadError || !question ? (
        <ErrorState
          title="Question cannot be edited"
          description={loadError ?? "Unable to load this question."}
        />
      ) : (
        <div className="space-y-6">
          <QuestionForm initialQuestion={question} />
          <div className="flex justify-end border-t border-workspace-separator pt-6">
            <DeleteQuestionButton questionId={question.id} />
          </div>
        </div>
      )}
    </PageShell>
  );
}
