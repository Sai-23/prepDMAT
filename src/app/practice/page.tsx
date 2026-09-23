import { redirect } from "next/navigation";
import { ArrowRight, BarChart3, BookOpenText, Calculator, Table2 } from "lucide-react";
import Link from "next/link";

import { PageShell } from "@/components/layout/page-shell";
import { PracticeExperience } from "@/components/practice/practice-experience";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/shared/error-state";
import { requireUser } from "@/lib/auth/guards";
import { getOnboardingState } from "@/lib/onboarding/data";
import { getGeneralAcademicDashboardActivity } from "@/lib/general-academic/practice-data";
import { isGeneralAcademicEnabled } from "@/lib/general-academic/feature-gate";
import { getActivePracticeSession, getExactPracticeModule, getPracticeLandingData } from "@/lib/practice/data";
import type { PracticeConfig } from "@/lib/practice/schemas";
import { CORE_SKILLS, coreSkill, type CoreSkillId } from "@/lib/progress/skills";

export default async function PracticePage({
  searchParams,
}: {
  searchParams: Promise<{ question?: string; module?: string; focus?: string; focusName?: string; difficulty?: string; count?: string; fromMock?: string }>;
}) {
  const user = await requireUser();
  const generalAcademicEnabled = isGeneralAcademicEnabled();
  const query = await searchParams;
  const questionId = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(query.question ?? "")
    ? query.question
    : undefined;
  let initialSession = null;
  let performance = null;
  let initialConfig: PracticeConfig | undefined;
  let loadError: string | null = null;
  let diagnosticInProgress = false;
  let generalAcademicActive: Awaited<ReturnType<typeof getGeneralAcademicDashboardActivity>>["active"] = null;

  try {
    const [landing, active, exactModule, onboarding, generalAcademic] = await Promise.all([
      getPracticeLandingData(user.id),
      getActivePracticeSession(user.id),
      questionId ? getExactPracticeModule(questionId) : Promise.resolve(null),
      getOnboardingState(user.id),
      generalAcademicEnabled ? getGeneralAcademicDashboardActivity(user.id).catch(() => ({ active: null, recent: [] })) : Promise.resolve({ active: null, recent: [] }),
    ]);
    diagnosticInProgress = onboarding.diagnosticStatus === "in_progress";
    performance = landing;
    initialSession = active;
    generalAcademicActive = generalAcademic.active;
    if (questionId && exactModule) {
      initialConfig = { questionId, module: exactModule, difficulty: "mixed", questionCount: 1, timingMode: "untimed" };
    } else if (
      query.module === "figure_sequence" || query.module === "mathematical_equation" || query.module === "latin_square"
    ) {
      const publicFocus = CORE_SKILLS.find(
        (skill) => skill.label === query.focusName && skill.module === query.module,
      );
      const focusFamilies = publicFocus
        ? [publicFocus.id]
        : query.focus?.split(",").map((value) => value.trim())
          .filter((value): value is CoreSkillId => coreSkill(value)?.module === query.module).slice(0, 3);
      initialConfig = {
        module: query.module,
        difficulty: query.difficulty === "easy" || query.difficulty === "medium" || query.difficulty === "hard" || query.difficulty === "mixed"
          ? query.difficulty : "mixed",
        questionCount: query.count === "5" || query.count === "20" ? Number(query.count) as 5 | 20 : 10,
        timingMode: "untimed",
        focusFamilies,
        sourceAttemptId: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(query.fromMock ?? "")
          ? query.fromMock : undefined,
      };
    }
  } catch {
    loadError = "Unable to load practice.";
  }

  if (diagnosticInProgress) redirect("/onboarding/diagnostic");

  return (
    <PageShell
      eyebrow="Practice"
      title="Practice"
    >
      <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">What do you want to practice?</h2>
        <p className="mt-1 text-sm text-muted-foreground">Build skills with focused practice sessions.</p>
      </div>
      {generalAcademicEnabled ? <section className="relative overflow-hidden rounded-xl border border-primary/40 bg-primary-muted p-5 shadow-sm sm:p-6" aria-labelledby="general-academic-practice">
        <div aria-hidden="true" className="absolute -right-10 -top-12 size-44 rounded-full bg-surface-lowest/50" />
        <div className="relative grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Major practice area</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight" id="general-academic-practice">General Academic</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-on-surface-variant">Work through academic sources and solve linked problems.</p>
            <ul aria-label="General Academic formats" className="mt-5 grid grid-cols-2 gap-2 text-sm sm:flex sm:flex-wrap">
              <li className="flex min-h-10 items-center gap-2 rounded-md border border-workspace-border bg-surface-lowest/80 px-3"><BookOpenText aria-hidden="true" className="size-4 text-primary" />Text</li>
              <li className="flex min-h-10 items-center gap-2 rounded-md border border-workspace-border bg-surface-lowest/80 px-3"><Calculator aria-hidden="true" className="size-4 text-primary" />Formulas</li>
              <li className="flex min-h-10 items-center gap-2 rounded-md border border-workspace-border bg-surface-lowest/80 px-3"><Table2 aria-hidden="true" className="size-4 text-primary" />Tables</li>
              <li className="flex min-h-10 items-center gap-2 rounded-md border border-workspace-border bg-surface-lowest/80 px-3"><BarChart3 aria-hidden="true" className="size-4 text-primary" />Graphs</li>
            </ul>
          </div>
          <div className="flex flex-col items-stretch gap-2 lg:min-w-48">
            {generalAcademicActive ? <p className="text-sm font-medium text-on-surface-variant lg:text-right">Practice in progress</p> : null}
            <Button asChild className="min-h-11 w-full" size="lg">
              <Link href={generalAcademicActive ? `/practice/general-academic/${generalAcademicActive.id}` : "/practice/general-academic"}>
                {generalAcademicActive ? "Resume Practice" : "Start Practice"}<ArrowRight aria-hidden="true" className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section> : null}
      <div className="border-t border-workspace-separator pt-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Core modules</p>
      </div>
      {loadError || !performance ? (
        <ErrorState title="Practice is not ready" description={loadError ?? "Unable to load practice."} />
      ) : (
        <PracticeExperience initialConfig={initialConfig} initialSession={initialSession} performance={performance} />
      )}
      </div>
    </PageShell>
  );
}
