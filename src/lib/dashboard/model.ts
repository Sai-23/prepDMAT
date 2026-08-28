import type {
  CoreProgress,
  Confidence,
  ModuleProgress,
  Trend,
} from "@/lib/progress/model";
import type { PracticeModule } from "@/lib/practice/schemas";
import type { StudentDiagnosticStatus } from "@/lib/constants/navigation";

export type DashboardActionKind =
  | "resume_mock"
  | "resume_practice"
  | "review_mock"
  | "progress_recommendation"
  | "start_practice"
  | "build_baseline"
  | "take_mock"
  | "continue_practice"
  | "take_diagnostic";

export interface DashboardAction {
  kind: DashboardActionKind;
  eyebrow: string;
  title: string;
  description: string;
  label: string;
  href: string;
}

interface ResumeCandidateBase {
  id: string;
  title: string;
  description: string;
  href: string;
  startedAt: string;
  expiresAt: string | null;
}

export interface MockResumeCandidate extends ResumeCandidateBase {
  kind: "mock";
}

export interface PracticeResumeCandidate extends ResumeCandidateBase {
  kind: "practice";
  timingMode: "timed" | "untimed";
}

export interface DiagnosticResumeCandidate extends ResumeCandidateBase {
  kind: "diagnostic";
}

export type DashboardResumeCandidate =
  | MockResumeCandidate
  | PracticeResumeCandidate
  | DiagnosticResumeCandidate;

export type DashboardActivityType = "practice" | "mock";

export interface DashboardActivity {
  id: string;
  type: DashboardActivityType;
  title: string;
  subtitle: string;
  completedAt: string;
  href: string;
  correctCount: number | null;
  questionCount: number | null;
  accuracy: number | null;
}

export interface DashboardLatestPractice {
  sessionId: string;
  title: string;
  module: PracticeModule;
  correctCount: number;
  questionCount: number;
  completedAt: string;
  href: string;
}

export interface DashboardLatestMock {
  attemptId: string;
  title: string;
  correctCount: number | null;
  questionCount: number | null;
  accuracy: number | null;
  completedAt: string;
  href: string;
}

export interface DashboardProgressModule {
  module: PracticeModule;
  label: string;
  attemptCount: number;
  recentAccuracy: number | null;
  trend: Trend;
  confidence: Confidence;
}

export interface DashboardProgressSnapshot {
  totalQuestions: number;
  totalCorrect: number;
  accuracy: number;
  modules: DashboardProgressModule[];
}

export interface DashboardQuickAction {
  key: "practice" | "mock" | "progress" | "results";
  label: string;
  description: string;
  href: string;
}

export interface StudentDashboardViewModel {
  displayName: string;
  diagnosticStatus: StudentDiagnosticStatus;
  targetExamDate: string | null;
  onDemandMocksEnabled: boolean;
  mockAvailable: boolean;
  primaryAction: DashboardAction;
  supportingAction: DashboardAction | null;
  quickActions: DashboardQuickAction[];
  progress: DashboardProgressSnapshot | null;
  progressUnavailable: boolean;
  recentActivity: DashboardActivity[];
  latestPractice: DashboardLatestPractice | null;
  latestMock: DashboardLatestMock | null;
}

export interface AssembleStudentDashboardInput {
  displayName: string;
  diagnosticStatus?: StudentDiagnosticStatus;
  targetExamDate: string | null;
  onDemandMocksEnabled: boolean;
  mockAvailable: boolean;
  resumeCandidates: DashboardResumeCandidate[];
  progress: CoreProgress | null;
  progressUnavailable?: boolean;
  recentActivity: DashboardActivity[];
  latestPractice: DashboardLatestPractice | null;
  latestMock: DashboardLatestMock | null;
  now: Date;
}

const MAX_RECENT_ACTIVITY = 5;

function timestamp(value: string): number {
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function isResumable(
  candidate: DashboardResumeCandidate,
  now: Date,
): boolean {
  if (!candidate.expiresAt) return true;
  return timestamp(candidate.expiresAt) > now.getTime();
}

function selectResumeCandidate(
  candidates: DashboardResumeCandidate[],
  now: Date,
): DashboardResumeCandidate | null {
  const resumable = candidates.filter((candidate) => isResumable(candidate, now));

  return (
    resumable.find((candidate) => candidate.kind === "mock") ??
    resumable.find((candidate) => candidate.kind === "diagnostic") ??
    resumable.find(
      (candidate) =>
        candidate.kind === "practice" && candidate.timingMode === "timed",
    ) ??
    resumable.find((candidate) => candidate.kind === "practice") ??
    null
  );
}

function buildResumeAction(candidate: DashboardResumeCandidate): DashboardAction {
  if (candidate.kind === "diagnostic") {
    return {
      kind: "resume_practice",
      eyebrow: "Continue where you left off",
      title: candidate.title,
      description: candidate.description,
      label: "Resume Diagnostic",
      href: candidate.href,
    };
  }
  return {
    kind: candidate.kind === "mock" ? "resume_mock" : "resume_practice",
    eyebrow: "Continue where you left off",
    title: candidate.title,
    description: candidate.description,
    label: candidate.kind === "mock" ? "Resume Core Mock" : "Resume Practice",
    href: candidate.href,
  };
}

function buildLatestMockAction(latestMock: DashboardLatestMock): DashboardAction {
  const score =
    latestMock.correctCount !== null && latestMock.questionCount !== null
      ? `${latestMock.correctCount} / ${latestMock.questionCount}`
      : latestMock.accuracy !== null
        ? `${Math.round(latestMock.accuracy)}% raw accuracy`
        : null;

  return {
    kind: "review_mock",
    eyebrow: "Recommended next",
    title: "Review your latest Core Mock",
    description: score
      ? `You scored ${score}. Review the attempt before choosing your next practice set.`
      : "Review the completed attempt before choosing your next practice set.",
    label: "Review Core Mock",
    href: latestMock.href,
  };
}

function buildProgressAction(progress: CoreProgress): DashboardAction | null {
  const recommendation = progress.recommendations[0];
  if (!recommendation) return null;
  const publicPracticeParams = new URLSearchParams({
    module: recommendation.module,
    difficulty: recommendation.difficulty,
    count: String(recommendation.questionCount),
    focusName: recommendation.skill,
  });

  return {
    kind: "progress_recommendation",
    eyebrow: "Recommended next",
    title: recommendation.skill,
    description: recommendation.reason,
    label: `Practice ${recommendation.skill}`,
    href: `/practice?${publicPracticeParams.toString()}`,
  };
}

function buildFallbackAction(
  progress: CoreProgress | null,
  mockAvailable: boolean,
): DashboardAction {
  const totalQuestions = progress?.totalQuestions ?? 0;

  if (totalQuestions === 0) {
    return {
      kind: "start_practice",
      eyebrow: "Recommended next",
      title: "Start your first Core practice",
      description:
        "Choose one Core module and complete a short validated set to begin building your progress history.",
      label: "Start Core Practice",
      href: "/practice",
    };
  }

  if (totalQuestions < 12) {
    return {
      kind: "build_baseline",
      eyebrow: "Recommended next",
      title: "Build a clearer Core baseline",
      description:
        "Complete another short Core practice set so your progress view has enough recent evidence to guide you.",
      label: "Continue Core Practice",
      href: "/practice",
    };
  }

  if (mockAvailable) {
    return {
      kind: "take_mock",
      eyebrow: "Recommended next",
      title: "Take a Core Mock",
      description:
        "Your recent Core practice is established. Test your pacing and accuracy in an exam-style attempt.",
      label: "Choose a Core Mock",
      href: "/tests",
    };
  }

  return {
    kind: "continue_practice",
    eyebrow: "Recommended next",
    title: "Continue Core practice",
    description:
      "Keep your Core preparation active with another validated practice set.",
    label: "Choose Core Practice",
    href: "/practice",
  };
}

function newestActivityIsLatestMock(
  activity: DashboardActivity[],
  latestMock: DashboardLatestMock | null,
): boolean {
  if (!latestMock || activity.length === 0) return false;
  const newest = [...activity].sort(
    (left, right) => timestamp(right.completedAt) - timestamp(left.completedAt),
  )[0];
  return newest?.type === "mock" && newest.id === latestMock.attemptId;
}

function selectNextAction(
  progress: CoreProgress | null,
  activity: DashboardActivity[],
  latestMock: DashboardLatestMock | null,
  mockAvailable: boolean,
  diagnosticStatus: StudentDiagnosticStatus,
): DashboardAction {
  if ((diagnosticStatus === "not_started" || diagnosticStatus === "skipped") && (progress?.totalQuestions ?? 0) === 0) {
    return {
      kind: "take_diagnostic",
      eyebrow: "Recommended starting point",
      title: "Take your Core diagnostic",
      description: "Answer 15 untimed questions to get a simple starting direction across the three Core modules.",
      label: "Take Diagnostic",
      href: "/onboarding",
    };
  }
  if (newestActivityIsLatestMock(activity, latestMock)) {
    return buildLatestMockAction(latestMock!);
  }

  return (
    (progress ? buildProgressAction(progress) : null) ??
    buildFallbackAction(progress, mockAvailable)
  );
}

function mapProgressModule(module: ModuleProgress): DashboardProgressModule {
  return {
    module: module.module,
    label: module.label,
    attemptCount: module.attemptCount,
    recentAccuracy: module.recentAccuracy,
    trend: module.trend,
    confidence: module.confidence,
  };
}

function buildProgressSnapshot(
  progress: CoreProgress | null,
): DashboardProgressSnapshot | null {
  if (!progress) return null;
  const totalCorrect = progress.modules.reduce(
    (sum, item) => sum + item.correctCount,
    0,
  );
  return {
    totalQuestions: progress.totalQuestions,
    totalCorrect,
    accuracy: progress.totalQuestions
      ? (totalCorrect / progress.totalQuestions) * 100
      : 0,
    modules: progress.modules.map(mapProgressModule),
  };
}

function buildQuickActions(mockAvailable: boolean): DashboardQuickAction[] {
  const actions: DashboardQuickAction[] = [
    {
      key: "practice",
      label: "Start Core Practice",
      description: "Choose a module, difficulty, and set length.",
      href: "/practice",
    },
  ];

  if (mockAvailable) {
    actions.push({
      key: "mock",
      label: "Take a Core Mock",
      description: "Open the available exam-style Core mocks.",
      href: "/tests",
    });
  }

  actions.push(
    {
      key: "progress",
      label: "View Core Progress",
      description: "See Phase 8 evidence-based module progress.",
      href: "/progress",
    },
    {
      key: "results",
      label: "Review Results",
      description: "Review completed Core mock attempts.",
      href: "/results",
    },
  );

  return actions;
}

export function assembleStudentDashboard(
  input: AssembleStudentDashboardInput,
): StudentDashboardViewModel {
  // Callers without an authoritative status keep the established dashboard
  // policy. Production data always supplies the profile-backed value.
  const diagnosticStatus = input.diagnosticStatus ?? "completed";
  const resumeCandidate = selectResumeCandidate(input.resumeCandidates, input.now);
  const recentActivity = [...input.recentActivity]
    .sort(
      (left, right) =>
        timestamp(right.completedAt) - timestamp(left.completedAt),
    )
    .slice(0, MAX_RECENT_ACTIVITY);
  const nextAction = selectNextAction(
    input.progress,
    recentActivity,
    input.latestMock,
    input.mockAvailable,
    diagnosticStatus,
  );

  return {
    displayName: input.displayName,
    diagnosticStatus,
    targetExamDate: input.targetExamDate,
    onDemandMocksEnabled: input.onDemandMocksEnabled,
    mockAvailable: input.mockAvailable,
    primaryAction: resumeCandidate
      ? buildResumeAction(resumeCandidate)
      : nextAction,
    supportingAction: resumeCandidate ? nextAction : null,
    quickActions: buildQuickActions(input.mockAvailable),
    progress: buildProgressSnapshot(input.progress),
    progressUnavailable: input.progressUnavailable ?? false,
    recentActivity,
    latestPractice: input.latestPractice,
    latestMock: input.latestMock,
  };
}
