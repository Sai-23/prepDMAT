import type { Route } from "next";
import {
  ArrowRight,
  Clock3,
  Crown,
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
  } catch (error) {
    loadError =
      error instanceof Error ? error.message : "Unable to load published tests.";
  }

  return (
    <PageShell
      eyebrow="Mock tests"
      title="Timed tests built for realistic preparation"
      description="Choose a diagnostic, mini mock, sectional test, or full simulation. Answers are autosaved and feedback is delayed until submission."
    >
      {onDemandEnabled ? (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <div className="flex items-center gap-3">
              <span className="rounded-2xl bg-blue-100 p-3 text-blue-700">
                <Sparkles aria-hidden="true" className="h-5 w-5" />
              </span>
              <div>
                <Badge variant="success">Generated Core Mock</Badge>
                <CardTitle className="mt-2">Create a fresh full Core mock</CardTitle>
              </div>
            </div>
            <CardDescription className="max-w-3xl pt-2">
              {coreQuestionCount} questions across {coreSections.length} Core sections. Each section has {Math.round(coreSections[0].durationSeconds / 60)} minutes and uses recent-mock history to reduce near-term structural repetition.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <GenerateCoreMockButton />
          </CardContent>
        </Card>
      ) : null}

      {loadError || !tests ? (
        <ErrorState
          title="Test catalog unavailable"
          description={loadError ?? "Unable to load published tests."}
        />
      ) : tests.length === 0 ? (
        <EmptyState
          title="No tests are published yet"
          description="Create test sections, assign approved questions, and publish the test to make it available here."
        />
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {tests.map((test) => (
            <Card className="flex flex-col" key={test.id}>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <Badge>{test.testType.replaceAll("_", " ")}</Badge>
                  {test.isPremium ? (
                    <Badge variant="warning">
                      <Crown aria-hidden="true" className="mr-1 h-3 w-3" />
                      Premium
                    </Badge>
                  ) : (
                    <Badge variant="success">Free</Badge>
                  )}
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
                <Button asChild variant={test.hasAccess ? "default" : "secondary"}>
                  <Link href={`/tests/${test.id}` as Route}>
                    {test.hasAccess ? "View test" : "View premium test"}
                    <ArrowRight aria-hidden="true" className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </PageShell>
  );
}
