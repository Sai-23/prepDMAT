import type { Route } from "next";
import {
  ArrowRight,
  Clock3,
  FileCheck2,
  Layers3,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

import { PageShell } from "@/components/layout/page-shell";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { DMAT_CURRENT_CORE_PROTOCOL } from "@/lib/protocol";
import { getEnv } from "@/lib/validators/env";

function formatDuration(seconds: number) {
  const minutes = Math.round(seconds / 60);
  return minutes >= 60
    ? `${Math.floor(minutes / 60)}h ${minutes % 60 ? `${minutes % 60}m` : ""}`
    : `${minutes} min`;
}

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
        <section aria-labelledby="other-mocks" className="space-y-4">
          <div><h2 className="text-xl font-semibold" id="other-mocks">Other mock tests</h2><p className="mt-1 text-sm text-muted-foreground">Shorter and custom tests for extra practice.</p></div>
          <div className="grid gap-5 md:grid-cols-2">
          {visibleTests.map((test) => (
            <Card className="flex flex-col" key={test.id}>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <Badge>{test.testType.replaceAll("_", " ")}</Badge>
                </div>
                <CardTitle className="pt-2 text-xl">{test.title}</CardTitle>
                <CardDescription>
                  {test.description ?? "A structured timed assessment."}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col justify-between gap-6">
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-2xl bg-slate-50 p-3">
                    <Clock3 className="h-4 w-4 text-blue-700" aria-hidden="true" />
                    <p className="mt-2 text-sm font-semibold">
                      {formatDuration(test.durationSeconds)}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-3">
                    <Layers3 className="h-4 w-4 text-blue-700" aria-hidden="true" />
                    <p className="mt-2 text-sm font-semibold">
                      {test.sectionCount} sections
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-3">
                    <FileCheck2 className="h-4 w-4 text-blue-700" aria-hidden="true" />
                    <p className="mt-2 text-sm font-semibold">
                      {test.questionCount} questions
                    </p>
                  </div>
                </div>
                <Button asChild>
                  <Link href={`/tests/${test.id}` as Route}>
                    View test
                    <ArrowRight aria-hidden="true" className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
          </div>
        </section>
      )}
    </PageShell>
  );
}
