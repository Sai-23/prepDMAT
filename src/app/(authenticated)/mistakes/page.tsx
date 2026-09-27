import { MistakeNotebook } from "@/components/learning/mistake-notebook";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/layout/page-shell";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { requireUser } from "@/lib/auth/guards";
import { getMistakes, type MistakeFilters } from "@/lib/learning/data";

type SearchParams = { status?: string; module?: string; difficulty?: string; source?: string; page?: string };

function filtersFrom(params: SearchParams): MistakeFilters {
  const modules = ["figure_sequence", "mathematical_equation", "latin_square"] as const;
  const difficulties = ["easy", "medium", "hard"] as const;
  const sources = ["practice", "diagnostic", "mock"] as const;
  return {
    status: params.status === "understood" || params.status === "all" ? params.status : "needs_review",
    module: modules.find((value) => value === params.module) ?? "all",
    difficulty: difficulties.find((value) => value === params.difficulty) ?? "all",
    source: sources.find((value) => value === params.source) ?? "all",
    page: Number.parseInt(params.page ?? "1", 10) || 1,
  };
}

export default async function MistakesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await requireUser();
  const filters = filtersFrom(await searchParams);
  let mistakes = null;
  let loadError: string | null = null;

  try {
    mistakes = await getMistakes(user.id, filters);
  } catch {
    loadError = "Unable to load your mistake notebook.";
  }

  return (
    <PageShell
      eyebrow="Mistake notebook"
      title="Turn incorrect answers into structured revision"
      description="Work through unresolved mistakes, record what you learned, and move understood items out of your review queue."
    >
      {loadError || !mistakes ? (
        <ErrorState
          title="Mistake notebook unavailable"
          description={loadError ?? "Unable to load your mistake notebook."}
        />
      ) : mistakes.historyTotal === 0 ? (
        <EmptyState
          action={<Button asChild><Link href="/practice">Start practice</Link></Button>}
          title="No mistakes recorded"
          description="Incorrect answers from completed practice sessions and mock tests are added automatically."
        />
      ) : (
        <div className="space-y-5">
          <details className="mistake-filters group rounded-md border border-workspace-border bg-surface-lowest">
            <summary className="cursor-pointer list-none px-4 py-3 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset md:hidden">Filters</summary>
            <form className="mistake-filter-panel hidden gap-3 p-4 group-open:grid md:grid md:grid-cols-5" method="get">
              <label className="space-y-1 text-xs font-semibold">Status<select className="mt-1 h-10 w-full rounded-md border border-workspace-border bg-background px-3 text-sm font-normal" defaultValue={filters.status} name="status"><option value="needs_review">Needs review</option><option value="understood">Understood</option><option value="all">All</option></select></label>
              <label className="space-y-1 text-xs font-semibold">Module<select className="mt-1 h-10 w-full rounded-md border border-workspace-border bg-background px-3 text-sm font-normal" defaultValue={filters.module} name="module"><option value="all">All</option><option value="figure_sequence">Figure Sequences</option><option value="mathematical_equation">Mathematical Equations</option><option value="latin_square">Latin Squares</option></select></label>
              <label className="space-y-1 text-xs font-semibold">Difficulty<select className="mt-1 h-10 w-full rounded-md border border-workspace-border bg-background px-3 text-sm font-normal" defaultValue={filters.difficulty} name="difficulty"><option value="all">All</option><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select></label>
              <label className="space-y-1 text-xs font-semibold">Source<select className="mt-1 h-10 w-full rounded-md border border-workspace-border bg-background px-3 text-sm font-normal" defaultValue={filters.source} name="source"><option value="all">All</option><option value="practice">Practice</option><option value="diagnostic">Diagnostic</option><option value="mock">Mock</option></select></label>
              <Button className="self-end" type="submit">Apply filters</Button>
            </form>
          </details>
          <MistakeNotebook mistakes={mistakes.items} status={filters.status ?? "needs_review"} total={mistakes.total} />
          {mistakes.total > mistakes.pageSize ? <nav aria-label="Mistake pages" className="flex items-center justify-center gap-3 text-sm">
            {mistakes.page > 1 ? <a className="font-semibold text-primary hover:underline" href={`?status=${filters.status}&module=${filters.module}&difficulty=${filters.difficulty}&source=${filters.source}&page=${mistakes.page - 1}`}>Previous</a> : null}
            <span>Page {mistakes.page} of {Math.ceil(mistakes.total / mistakes.pageSize)}</span>
            {mistakes.page * mistakes.pageSize < mistakes.total ? <a className="font-semibold text-primary hover:underline" href={`?status=${filters.status}&module=${filters.module}&difficulty=${filters.difficulty}&source=${filters.source}&page=${mistakes.page + 1}`}>Next</a> : null}
          </nav> : null}
        </div>
      )}
    </PageShell>
  );
}
