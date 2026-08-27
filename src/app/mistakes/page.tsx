import { MistakeNotebook } from "@/components/learning/mistake-notebook";
import { PageShell } from "@/components/layout/page-shell";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { requireUser } from "@/lib/auth/guards";
import { getMistakes } from "@/lib/learning/data";

export default async function MistakesPage() {
  const user = await requireUser();
  let mistakes = null;
  let loadError: string | null = null;

  try {
    mistakes = await getMistakes(user.id);
  } catch {
    loadError = "Unable to load your mistake notebook.";
  }

  return (
    <PageShell
      eyebrow="Mistake notebook"
      title="Turn incorrect answers into structured revision"
      description="Review repeated errors, record what you learned, track understood questions, save useful items, and reattempt the exact question."
    >
      {loadError || !mistakes ? (
        <ErrorState
          title="Mistake notebook unavailable"
          description={loadError ?? "Unable to load your mistake notebook."}
        />
      ) : mistakes.length === 0 ? (
        <EmptyState
          title="No mistakes recorded"
          description="Incorrect answers from completed practice sessions and mock tests are added automatically."
        />
      ) : (
        <MistakeNotebook mistakes={mistakes} />
      )}
    </PageShell>
  );
}
