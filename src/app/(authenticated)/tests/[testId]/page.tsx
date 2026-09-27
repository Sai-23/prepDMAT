import {
  CheckCircle2,
  Clock3,
  FileQuestion,
  Layers3,
  ShieldCheck,
} from "lucide-react";
import { notFound } from "next/navigation";

import { PageShell } from "@/components/layout/page-shell";
import { ErrorState } from "@/components/shared/error-state";
import { StartTestButton } from "@/components/tests/start-test-button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireUser } from "@/lib/auth/guards";
import { getTestOverview } from "@/lib/tests/data";
import { testIdSchema } from "@/lib/tests/schemas";

export default async function TestOverviewPage({
  params,
}: {
  params: Promise<{ testId: string }>;
}) {
  const user = await requireUser();
  const parsed = testIdSchema.safeParse((await params).testId);
  if (!parsed.success) notFound();

  let test = null;
  let loadError: string | null = null;
  try {
    test = await getTestOverview(user.id, parsed.data);
  } catch {
    loadError = "Unable to load this test.";
  }
  if (!loadError && !test) notFound();
  if (!loadError && test && !test.hasAccess) notFound();

  return (
    <PageShell
      eyebrow="Test instructions"
      title={test?.title ?? "Test unavailable"}
      description={
        test?.description ??
        "Review the test requirements before beginning your timed attempt."
      }
    >
      {loadError || !test ? (
        <ErrorState
          title="Test unavailable"
          description={loadError ?? "This test could not be found."}
        />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex flex-wrap gap-2">
                  <Badge>{test.testType.replaceAll("_", " ")}</Badge>
                </div>
                <CardTitle className="pt-2">Before you begin</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <Clock3 className="h-5 w-5 text-blue-700" />
                    <p className="mt-2 font-semibold">
                      {Math.round(test.durationSeconds / 60)} minutes
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <Layers3 className="h-5 w-5 text-blue-700" />
                    <p className="mt-2 font-semibold">{test.sectionCount} sections</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <FileQuestion className="h-5 w-5 text-blue-700" />
                    <p className="mt-2 font-semibold">
                      {test.questionCount} questions
                    </p>
                  </div>
                </div>
                <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
                  <p className="font-semibold text-slate-900">Instructions</p>
                  <p className="mt-2 whitespace-pre-line text-sm leading-7 text-slate-700">
                    {test.instructions ??
                      "Answer every question you can. You may move between questions, change answers, and mark items for review before submitting."}
                  </p>
                </div>
                <ul className="space-y-3 text-sm leading-6 text-slate-700">
                  <li className="flex gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                    Responses are saved whenever you select an option or navigate.
                  </li>
                  <li className="flex gap-3">
                    <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
                    Correct answers and explanations remain hidden until submission.
                  </li>
                  <li className="flex gap-3">
                    <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                    The attempt is automatically submitted when time expires.
                  </li>
                  {test.sectionCount > 1 ? <li className="flex gap-3"><Layers3 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />When a timed section ends, the test moves forward and you cannot return to that section.</li> : null}
                </ul>
              </CardContent>
            </Card>

            {test.sections.length ? (
              <Card>
                <CardHeader>
                  <CardTitle>Test structure</CardTitle>
                </CardHeader>
                <CardContent className="divide-y divide-slate-100">
                  {test.sections.map((section, index) => (
                    <div
                      className="flex items-center justify-between gap-4 py-4 first:pt-0"
                      key={section.id}
                    >
                      <div>
                        <p className="font-semibold">
                          {index + 1}. {section.title}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {section.questionCount} questions
                        </p>
                      </div>
                      <p className="text-sm font-medium text-slate-600">
                        {Math.round(section.durationSeconds / 60)} min
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ) : null}
          </div>

          <Card className="h-fit xl:sticky xl:top-28">
            <CardHeader>
              <CardTitle>Ready to begin?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-6 text-slate-600">
                Starting creates a timed attempt. If you already have an active attempt,
                it will resume from your saved responses.
              </p>
              <StartTestButton testId={test.id} />
            </CardContent>
          </Card>
        </div>
      )}
    </PageShell>
  );
}
