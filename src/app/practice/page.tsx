import { redirect } from "next/navigation";

import { PageShell } from "@/components/layout/page-shell";
import { PracticeExperience } from "@/components/practice/practice-experience";
import { ErrorState } from "@/components/shared/error-state";
import { requireUser } from "@/lib/auth/guards";
import { getOnboardingState } from "@/lib/onboarding/data";
import { getActivePracticeSession, getExactPracticeModule, getPracticeLandingData } from "@/lib/practice/data";
import type { PracticeConfig } from "@/lib/practice/schemas";
import { CORE_SKILLS, coreSkill, type CoreSkillId } from "@/lib/progress/skills";

export default async function PracticePage({
  searchParams,
}: {
  searchParams: Promise<{ question?: string; module?: string; focus?: string; focusName?: string; difficulty?: string; count?: string; fromMock?: string }>;
}) {
  const user = await requireUser();
  const query = await searchParams;
  const questionId = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(query.question ?? "")
    ? query.question
    : undefined;
  let initialSession = null;
  let performance = null;
  let initialConfig: PracticeConfig | undefined;
  let loadError: string | null = null;
  let diagnosticInProgress = false;

  try {
    const [landing, active, exactModule, onboarding] = await Promise.all([
      getPracticeLandingData(user.id),
      getActivePracticeSession(user.id),
      questionId ? getExactPracticeModule(questionId) : Promise.resolve(null),
      getOnboardingState(user.id),
    ]);
    diagnosticInProgress = onboarding.diagnosticStatus === "in_progress";
    performance = landing;
    initialSession = active;
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
      title="What do you want to practise?"
      description="Choose a Core module, answer at your own pace or against the clock, and learn from feedback after each question."
    >
      {loadError || !performance ? (
        <ErrorState title="Practice is not ready" description={loadError ?? "Unable to load practice."} />
      ) : (
        <PracticeExperience initialConfig={initialConfig} initialSession={initialSession} performance={performance} />
      )}
    </PageShell>
  );
}
