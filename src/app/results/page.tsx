import type { Route } from "next";
import { ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";

import { PageShell } from "@/components/layout/page-shell";
import { MockAnalysisView } from "@/components/results/mock-analysis-view";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/guards";
import { getResultHistory } from "@/lib/results/data";
import { getMockAnalysis } from "@/lib/results/mock-analysis-data";
import { resultAttemptIdSchema } from "@/lib/results/schemas";

const dateFormatter = new Intl.DateTimeFormat("en", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export default async function ResultsPage({
  searchParams,
}: {
  searchParams: Promise<{ attempt?: string }>;
}) {
  const user = await requireUser();
  const requestedAttempt = (await searchParams).attempt;
  const parsedAttempt = requestedAttempt ? resultAttemptIdSchema.safeParse(requestedAttempt) : null;
  let history = null;
  let loaded = null;
  let loadError: string | null = null;

  try {
    if (requestedAttempt) {
      if (!parsedAttempt?.success) {
        loadError = "The requested result identifier is invalid.";
      } else {
        loaded = await getMockAnalysis(user.id, parsedAttempt.data);
        if (!loaded) loadError = "This completed attempt could not be found.";
      }
    } else {
      history = await getResultHistory(user.id);
    }
  } catch {
    loadError = "Unable to load your results.";
  }

  if (requestedAttempt) {
    return (
      <PageShell
        eyebrow="Core mock result"
        title={loaded?.result.testTitle ?? "Result unavailable"}
        description="See your score, review each section, and choose what to work on next."
      >
        {loadError || !loaded ? (
          <>
            <ErrorState title="Result unavailable" description={loadError ?? "This result could not be loaded."} />
            <Button asChild variant="secondary"><Link href="/results"><ArrowLeft className="h-4 w-4" />Back to results</Link></Button>
          </>
        ) : (
          <>
            <div><Button asChild size="sm" variant="ghost"><Link href="/results"><ArrowLeft className="h-4 w-4" />All results</Link></Button></div>
            <MockAnalysisView analysis={loaded.analysis} result={loaded.result} />
          </>
        )}
      </PageShell>
    );
  }

  return (
    <PageShell
      eyebrow="Results"
      title="Completed attempts"
      description="Open a completed mock to see your score, review mistakes, and decide what to practise next."
    >
      {loadError || !history ? (
        <ErrorState title="Results unavailable" description={loadError ?? "Unable to load your result history."} />
      ) : history.length === 0 ? (
        <EmptyState
          action={<Button asChild><Link href="/tests">Browse mock tests <ArrowRight className="h-4 w-4" /></Link></Button>}
          title="No completed mocks yet"
          description="Complete a focused or Full Core mock and its detailed result will appear here. Recent Practice reviews are available from your Dashboard."
        />
      ) : (
        <div className="space-y-4">
          {history.map((attempt) => (
            <Card key={attempt.id}>
              <CardContent className="grid gap-5 p-6 md:grid-cols-[1fr_auto_auto] md:items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-slate-950">{attempt.testTitle}</p>
                    <Badge variant={attempt.origin === "generated" ? "success" : "subtle"}>{attempt.origin === "generated" ? "Full Core" : "Custom"}</Badge>
                    <Badge variant={attempt.status === "auto_submitted" ? "warning" : "success"}>{attempt.status.replace("_", " ")}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-slate-500">{dateFormatter.format(new Date(attempt.submittedAt ?? attempt.startedAt))}</p>
                </div>
                <div><p className="text-xs text-slate-500">Score</p><p className="mt-1 font-semibold">{Math.round(attempt.accuracy)}%</p></div>
                <Button asChild size="sm" variant="secondary"><Link href={`/results?attempt=${attempt.id}` as Route}>View Result<ArrowRight className="h-4 w-4" /></Link></Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </PageShell>
  );
}
