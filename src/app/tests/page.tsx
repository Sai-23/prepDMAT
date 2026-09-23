import { ArrowLeft, ArrowRight, BookOpenText, Sparkles } from "lucide-react";
import Link from "next/link";

import { PageShell } from "@/components/layout/page-shell";
import { ErrorState } from "@/components/shared/error-state";
import { GenerateCoreMockButton } from "@/components/tests/generate-core-mock-button";
import {
  MockCategoryGrid,
  ModuleMockList,
} from "@/components/tests/mock-library";
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
import { DMAT_CURRENT_CORE_PROTOCOL } from "@/lib/protocol";
import { getMockCategory } from "@/lib/tests/catalog";
import { getTestCatalog } from "@/lib/tests/data";
import { getEnv } from "@/lib/validators/env";
import { isGeneralAcademicUiEnabled } from "@/lib/general-academic/feature-gate";

function OnDemandCoreMock() {
  const coreSections = DMAT_CURRENT_CORE_PROTOCOL.core;
  const coreQuestionCount = coreSections.reduce(
    (sum, section) => sum + section.questionCount,
    0,
  );
  const sectionMinutes = Math.round(coreSections[0].durationSeconds / 60);
  return (
    <Card className="border-primary bg-primary-muted lg:flex lg:items-center lg:justify-between">
      <CardHeader className="flex-1 p-5">
        <div className="flex items-center gap-3">
          <span className="rounded-xl bg-surface-lowest p-3 text-primary shadow-sm">
            <Sparkles aria-hidden="true" className="size-6" />
          </span>
          <div className="min-w-0">
            <Badge variant="success">Official Core format</Badge>
            <CardTitle className="mt-2">Full Core mock</CardTitle>
          </div>
        </div>
        <CardDescription className="max-w-3xl pt-1">
          {coreQuestionCount} questions · {coreSections.length} sections · {sectionMinutes} minutes per section · approximately 90 minutes including transitions.
        </CardDescription>
      </CardHeader>
      <CardContent className="shrink-0 p-5 pt-0 lg:pl-0 lg:pt-5">
        <GenerateCoreMockButton />
      </CardContent>
    </Card>
  );
}

export default async function TestsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string | string[] }>;
}) {
  const user = await requireUser();
  const requestedCategory = (await searchParams).category;
  const selectedCategory = getMockCategory(
    typeof requestedCategory === "string" ? requestedCategory : null,
  );
  const onDemandEnabled = getEnv().ENABLE_ON_DEMAND_CORE_MOCKS;
  const generalAcademicEnabled = isGeneralAcademicUiEnabled();
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
      description={selectedCategory
        ? selectedCategory.description
        : "Choose an official-format assessment or a focused timed mock."}
      eyebrow={selectedCategory ? "Mock tests" : "Mock library"}
      title={selectedCategory?.title ?? "Mock Tests"}
    >
      {selectedCategory ? (
        <div>
          <Button asChild size="sm" variant="ghost">
            <Link href="/tests">
              <ArrowLeft aria-hidden="true" className="size-4" />
              Mock Tests
            </Link>
          </Button>
        </div>
      ) : null}

      {selectedCategory && (loadError || !visibleTests) ? (
        <ErrorState description={loadError ?? "Unable to load published tests."} title="Test catalog unavailable" />
      ) : selectedCategory && visibleTests ? (
        <div className="space-y-5">
          {selectedCategory.key === "mixed-core" && onDemandEnabled ? (
            <OnDemandCoreMock />
          ) : null}
          <ModuleMockList category={selectedCategory} tests={visibleTests} />
        </div>
      ) : !selectedCategory ? (
        <div className="space-y-7">
          {generalAcademicEnabled ? <section aria-labelledby="gam-mock-heading" className="space-y-3">
            <div>
              <h2 className="text-xl font-semibold text-on-surface" id="gam-mock-heading">General Academic Module</h2>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-on-surface-variant">Take a 90-minute PrepDMAT simulation composed from complete published academic source packs.</p>
            </div>
            <Card className="lg:flex lg:items-center lg:justify-between"><CardHeader className="flex-1 p-5"><div className="flex items-center gap-3"><span className="rounded-xl bg-primary-muted p-3 text-primary"><BookOpenText className="size-6" /></span><div><Badge variant="subtle">PrepDMAT simulation</Badge><CardTitle className="mt-2">Full General Academic mock</CardTitle></div></div><CardDescription className="max-w-3xl pt-1">Multiple complete source packs · one shared 90-minute timer · source-aware review after submission.</CardDescription></CardHeader><CardContent className="shrink-0 p-5 pt-0 lg:pl-0 lg:pt-5"><Button asChild><Link href="/mock/general-academic">Open GAM Mocks <ArrowRight className="size-4" /></Link></Button></CardContent></Card>
          </section> : null}
          {onDemandEnabled ? (
            <section aria-labelledby="full-core-heading" className="space-y-3">
              <div>
                <h2 className="text-xl font-semibold text-on-surface" id="full-core-heading">
                  Practise under test conditions
                </h2>
                <p className="mt-1 max-w-3xl text-sm leading-6 text-on-surface-variant">
                  Take a full official-format Core mock or choose a shorter focused test. Answers are saved and feedback stays hidden until submission.
                </p>
              </div>
              <OnDemandCoreMock />
            </section>
          ) : null}

          <section aria-labelledby="focused-core-heading" className="space-y-3">
            <div>
              <h2 className="text-xl font-semibold text-on-surface" id="focused-core-heading">
                Choose a Core section
              </h2>
              <p className="mt-1 text-sm text-on-surface-variant">
                Practise one section at a time with focused timed mocks.
              </p>
            </div>
            {loadError || !visibleTests ? (
              <ErrorState description={loadError ?? "Unable to load published tests."} title="Test catalog unavailable" />
            ) : (
              <MockCategoryGrid tests={visibleTests} />
            )}
          </section>
        </div>
      ) : null}
    </PageShell>
  );
}
