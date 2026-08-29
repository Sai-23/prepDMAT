import {
  CheckCircle2,
  Clock3,
  FileCheck2,
  Layers3,
  Sparkles,
} from "lucide-react";

import { PageShell } from "@/components/layout/page-shell";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireUser } from "@/lib/auth/guards";
import { getTestCatalog } from "@/lib/tests/data";
import { GenerateCoreMockButton } from "@/components/tests/generate-core-mock-button";
import { StartTestButton } from "@/components/tests/start-test-button";
import { DMAT_CURRENT_CORE_PROTOCOL } from "@/lib/protocol";
import { getEnv } from "@/lib/validators/env";
import type { TestCatalogItem } from "@/lib/tests/schemas";

function formatDuration(seconds: number) {
  const minutes = Math.round(seconds / 60);
  return minutes >= 60
    ? `${Math.floor(minutes / 60)}h ${minutes % 60 ? `${minutes % 60}m` : ""}`
    : `${minutes} min`;
}

const mockGroups: Array<{
  moduleType: TestCatalogItem["moduleType"];
  title: string;
  description: string;
}> = [
  { moduleType: "figure_sequence", title: "Figure Sequences", description: "Build visual pattern recognition and transformation speed." },
  { moduleType: "mathematical_equation", title: "Mathematical Equations", description: "Practise symbol rules, arithmetic structure and precise calculation." },
  { moduleType: "latin_square", title: "Latin Squares", description: "Strengthen elimination, consistency and grid reasoning." },
  { moduleType: null, title: "Mixed Core", description: "Combine multiple Core formats in one timed mock." },
];

export default async function TestsPage() {
  const user = await requireUser();
  const onDemandEnabled = getEnv().ENABLE_ON_DEMAND_CORE_MOCKS;
  const coreSections = DMAT_CURRENT_CORE_PROTOCOL.core;
  const coreQuestionCount = coreSections.reduce((sum, section) => sum + section.questionCount, 0);
  let tests = null;
  let loadError: string | null = null;

  try {
    tests = await getTestCatalog(user.id);
  } catch {
    loadError = "Unable to load published tests.";
  }
  const visibleTests = tests?.filter((test) => test.hasAccess) ?? null;

  return (
    <PageShell
      eyebrow="Mock tests"
      title="Practise under test conditions"
      description="Take a full official-format Core mock or choose a shorter custom test. Answers are saved and feedback stays hidden until submission."
    >
      {onDemandEnabled ? (
        <Card className="border-primary bg-primary-muted">
          <CardHeader>
            <div className="flex items-center gap-3">
              <span className="rounded-2xl bg-blue-100 p-3 text-blue-700">
                <Sparkles aria-hidden="true" className="h-5 w-5" />
              </span>
              <div>
                <Badge variant="success">Official Core format</Badge>
                <CardTitle className="mt-2">Full Core mock</CardTitle>
              </div>
            </div>
            <CardDescription className="max-w-3xl pt-2">
              {coreQuestionCount} questions across {coreSections.length} sections · {Math.round(coreSections[0].durationSeconds / 60)} minutes per section · approximately 90 minutes including transitions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <GenerateCoreMockButton />
          </CardContent>
        </Card>
      ) : null}

      {loadError || !visibleTests ? (
        <ErrorState
          title="Test catalog unavailable"
          description={loadError ?? "Unable to load published tests."}
        />
      ) : visibleTests.length === 0 ? (
        <EmptyState
          title="No tests are published yet"
          description="Your available custom mocks will appear here. You can start with the full Core mock above."
        />
      ) : (
        <section aria-labelledby="mock-library" className="space-y-8">
          <div><h2 className="text-xl font-semibold" id="mock-library">Mock library</h2><p className="mt-1 text-sm text-muted-foreground">Choose a module, see your history, and start or retake a mock directly.</p></div>
          {mockGroups.map((group) => {
            const groupedTests = visibleTests.filter((test) => test.moduleType === group.moduleType);
            if (!groupedTests.length) return null;
            return (
              <section className="space-y-3" key={group.title}>
                <div><h3 className="text-lg font-semibold">{group.title}</h3><p className="text-sm text-muted-foreground">{group.description}</p></div>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {groupedTests.map((test) => {
                    const summary = test.attemptSummary;
                    const actionLabel = summary.hasInProgress
                      ? "Resume mock"
                      : summary.completed
                        ? "Try again"
                        : "Start mock";
                    return (
                      <Card className="flex flex-col" key={test.id}>
                        <CardHeader className="space-y-2 p-4 pb-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <Badge>{test.testType.replaceAll("_", " ")}</Badge>
                            {summary.completed ? <span className="inline-flex items-center gap-1 text-xs font-semibold text-success"><CheckCircle2 aria-hidden="true" className="size-4" />Completed</span> : null}
                          </div>
                          <CardTitle className="text-base">{test.title}</CardTitle>
                          {test.description ? <CardDescription className="line-clamp-2">{test.description}</CardDescription> : null}
                        </CardHeader>
                        <CardContent className="flex flex-1 flex-col justify-between gap-4 p-4 pt-2">
                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <p className="rounded-lg bg-surface-low p-2"><Clock3 aria-hidden="true" className="mb-1 size-4 text-primary" />{formatDuration(test.durationSeconds)}</p>
                            <p className="rounded-lg bg-surface-low p-2"><Layers3 aria-hidden="true" className="mb-1 size-4 text-primary" />{test.sectionCount} {test.sectionCount === 1 ? "section" : "sections"}</p>
                            <p className="rounded-lg bg-surface-low p-2"><FileCheck2 aria-hidden="true" className="mb-1 size-4 text-primary" />{test.questionCount} questions</p>
                          </div>
                          {summary.completed ? (
                            <dl className="grid grid-cols-3 gap-2 border-t border-workspace-separator pt-3 text-xs">
                              <div><dt className="text-muted-foreground">Best</dt><dd className="font-semibold">{summary.bestScore}/{test.questionCount}</dd></div>
                              <div><dt className="text-muted-foreground">Latest</dt><dd className="font-semibold">{summary.latestScore}/{test.questionCount}</dd></div>
                              <div><dt className="text-muted-foreground">Attempts</dt><dd className="font-semibold">{summary.attemptCount}</dd></div>
                            </dl>
                          ) : null}
                          <StartTestButton label={actionLabel} testId={test.id} />
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </section>
      )}
    </PageShell>
  );
}
