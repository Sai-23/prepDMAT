"use client";

import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Clock3,
  FileQuestion,
  Layers3,
  Plus,
  RefreshCw,
  Save,
  Search,
  Send,
  Trash2,
  X,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useActionState, useMemo, useRef, useState } from "react";

import {
  saveAdminTestAction,
  smartFillAdminQuestionsAction,
  type AdminTestFormState,
} from "@/app/admin/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type {
  AdminQuestionBankItem,
  EditableAdminTest,
} from "@/lib/admin/test-schemas";
import {
  filterMockQuestions,
  getSmartFillAvailability,
  getSmartFillTargetState,
  selectSmartFillQuestions,
  summarizeMockComposition,
} from "@/lib/admin/mock-builder";
import { ADMIN_CORE_SECTION_TYPE_OPTIONS } from "@/lib/admin/core-options";

type BuilderSection = EditableAdminTest["sections"][number] & {
  clientId: string;
  smartFillCount: string;
  allowPublishedFocusedReuse: boolean;
  smartFillGenerated: boolean;
  smartFillMessage: string | null;
  smartFillMessageTone: "info" | "success" | "warning" | "error";
};

const initialState: AdminTestFormState = { status: "idle" };

function newSection(index: number): BuilderSection {
  return {
    clientId: `new-${Date.now()}-${index}`,
    title: `Section ${index + 1}`,
    sectionType: "mixed",
    module: null,
    durationSeconds: 1800,
    focusDifficulty: null,
    questionIds: [],
    smartFillCount: "20",
    allowPublishedFocusedReuse: false,
    smartFillGenerated: false,
    smartFillMessage: null,
    smartFillMessageTone: "info",
  };
}

function formatMinutes(seconds: number) {
  return `${Math.round(seconds / 60)} min`;
}

export function TestBuilder({
  questionBank,
  initialTest,
}: {
  questionBank: AdminQuestionBankItem[];
  initialTest?: EditableAdminTest;
}) {
  const [state, formAction, pending] = useActionState(
    saveAdminTestAction,
    initialState,
  );
  const [testModule, setTestModule] = useState<string>(
    initialTest?.module ?? "core",
  );
  const [sections, setSections] = useState<BuilderSection[]>(() =>
    initialTest?.sections.length
      ? initialTest.sections.map((section, index) => ({
          ...section,
          focusDifficulty: section.sectionType === "mixed"
            ? null
            : section.focusDifficulty ??
              questionBank.find((question) => section.questionIds.includes(question.id))?.difficulty ??
              "easy",
          clientId: `existing-${index}`,
          smartFillCount: String(section.questionIds.length || 20),
          allowPublishedFocusedReuse: false,
          smartFillGenerated: false,
          smartFillMessage: null,
          smartFillMessageTone: "info",
        }))
      : [newSection(0)],
  );
  const [search, setSearch] = useState("");
  const [difficulty, setDifficulty] = useState("all");
  const [questionType, setQuestionType] = useState("all");
  const [selectingSectionId, setSelectingSectionId] = useState<string | null>(null);
  const selectingSectionIdRef = useRef<string | null>(null);

  const questionById = useMemo(
    () => new Map(questionBank.map((question) => [question.id, question])),
    [questionBank],
  );
  const assignedQuestionIds = useMemo(
    () => new Set(sections.flatMap((section) => section.questionIds)),
    [sections],
  );
  const totalDurationSeconds = sections.reduce(
    (total, section) => total + section.durationSeconds,
    0,
  );
  const totalQuestions = sections.reduce(
    (total, section) => total + section.questionIds.length,
    0,
  );
  const selectedQuestions = sections.flatMap((section) =>
    section.questionIds.flatMap((questionId) => {
      const question = questionById.get(questionId);
      return question ? [question] : [];
    }),
  );
  const composition = summarizeMockComposition(selectedQuestions);
  const inventoryDifficultyCounts = {
    easy: questionBank.filter((question) => question.difficulty === "easy").length,
    medium: questionBank.filter((question) => question.difficulty === "medium").length,
    hard: questionBank.filter((question) => question.difficulty === "hard").length,
  };

  const updateSection = (
    clientId: string,
    update: (section: BuilderSection) => BuilderSection,
  ) => {
    setSections((current) =>
      current.map((section) =>
        section.clientId === clientId ? update(section) : section,
      ),
    );
  };

  const changeTestModule = (value: string) => {
    setTestModule(value);
    if (!value) return;
    setSections((current) =>
      current.map((section) => ({
        ...section,
        module: value as BuilderSection["module"],
        questionIds: section.questionIds.filter(
          (questionId) => questionById.get(questionId)?.module === value,
        ),
      })),
    );
  };

  const changeSectionModule = (clientId: string, value: string) => {
    updateSection(clientId, (section) => ({
      ...section,
      module: (value || null) as BuilderSection["module"],
      questionIds: value
        ? section.questionIds.filter(
            (questionId) => questionById.get(questionId)?.module === value,
          )
        : section.questionIds,
    }));
  };

  const toggleQuestion = (
    clientId: string,
    questionId: string,
    checked: boolean,
  ) => {
    if (selectingSectionIdRef.current === clientId) return;
    updateSection(clientId, (section) => ({
      ...section,
      questionIds: checked
        ? [...section.questionIds, questionId]
        : section.questionIds.filter((id) => id !== questionId),
      smartFillGenerated: false,
      smartFillMessage: null,
      smartFillMessageTone: "info",
    }));
  };

  const smartFillLabel = (section: BuilderSection) =>
    section.sectionType.replaceAll("_", " ");

  const smartFillSection = async (clientId: string, regenerate = false) => {
    if (selectingSectionIdRef.current) return;
    const section = sections.find((item) => item.clientId === clientId);
    if (!section || section.sectionType === "mixed" || !section.focusDifficulty) return;
    const target = getSmartFillTargetState(
      section.smartFillCount,
      section.questionIds.length,
    );
    if (target.status === "invalid") {
      updateSection(clientId, (current) => ({
        ...current,
        smartFillMessage: target.message,
        smartFillMessageTone: "error",
      }));
      return;
    }
    if (!regenerate && target.status === "at_target") {
      updateSection(clientId, (current) => ({
        ...current,
        smartFillMessage: `Section already contains ${target.targetCount} questions.`,
        smartFillMessageTone: "info",
      }));
      return;
    }
    if (!regenerate && target.status === "above_target") {
      updateSection(clientId, (current) => ({
        ...current,
        smartFillMessage: `Section currently contains ${target.currentCount} questions. Remove ${target.excessCount} questions before using Smart Fill for a target of ${target.targetCount}.`,
        smartFillMessageTone: "warning",
      }));
      return;
    }

    selectingSectionIdRef.current = clientId;
    setSelectingSectionId(clientId);
    try {
      const result = await smartFillAdminQuestionsAction({
        testId: initialTest?.id,
        questionType: section.sectionType,
        difficulty: section.focusDifficulty,
        targetCount: target.targetCount,
        existingQuestionIds: section.questionIds,
        otherQuestionIds: sections
          .filter((item) => item.clientId !== clientId)
          .flatMap((item) => item.questionIds),
        allowPublishedFocusedReuse: section.allowPublishedFocusedReuse,
        mode: regenerate ? "regenerate" : "fill",
        seed: crypto.randomUUID(),
      });
      if (result.status !== "selected") {
        updateSection(clientId, (current) => ({
          ...current,
          smartFillMessage: result.message,
          smartFillMessageTone:
            result.status === "above_target"
              ? "warning"
              : result.status === "at_target"
                ? "info"
                : "error",
        }));
        return;
      }
      updateSection(clientId, (current) => ({
        ...current,
        questionIds: result.questionIds,
        smartFillGenerated: true,
        smartFillMessage: result.message,
        smartFillMessageTone: "success",
      }));
    } catch {
      updateSection(clientId, (current) => ({
        ...current,
        smartFillMessage:
          "Unable to select eligible questions. Check the section and try again.",
        smartFillMessageTone: "error",
      }));
    } finally {
      selectingSectionIdRef.current = null;
      setSelectingSectionId(null);
    }
  };

  const replaceQuestion = (clientId: string, questionId: string) => {
    const section = sections.find((item) => item.clientId === clientId);
    if (!section || section.sectionType === "mixed" || !section.focusDifficulty) return;
    const result = selectSmartFillQuestions(questionBank, {
      questionType: section.sectionType,
      difficulty: section.focusDifficulty,
      count: 1,
      excludedQuestionIds: assignedQuestionIds,
      allowPublishedFocusedReuse: section.allowPublishedFocusedReuse,
      seed: crypto.randomUUID(),
    });
    if (result.status === "insufficient") {
      updateSection(clientId, (current) => ({
        ...current,
        smartFillMessage: "No different eligible replacement is currently available.",
        smartFillMessageTone: "error",
      }));
      return;
    }
    updateSection(clientId, (current) => ({
      ...current,
      questionIds: current.questionIds.map((id) =>
        id === questionId ? result.questions[0].id : id,
      ),
      smartFillMessage: "Question replaced with another eligible question.",
      smartFillMessageTone: "success",
    }));
  };

  const moveSection = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= sections.length) return;
    setSections((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const moveQuestion = (
    clientId: string,
    questionIndex: number,
    direction: -1 | 1,
  ) => {
    updateSection(clientId, (section) => {
      const target = questionIndex + direction;
      if (target < 0 || target >= section.questionIds.length) return section;
      const questionIds = [...section.questionIds];
      [questionIds[questionIndex], questionIds[target]] = [
        questionIds[target],
        questionIds[questionIndex],
      ];
      return { ...section, questionIds };
    });
  };

  const normalizedSections = sections.map(
    ({ title, sectionType, module, durationSeconds, focusDifficulty, questionIds }) => ({
      title,
      sectionType,
      module,
      durationSeconds,
      focusDifficulty,
      questionIds,
    }),
  );

  return (
    <form action={formAction} className="grid gap-6 xl:grid-cols-[1fr_340px]">
      {initialTest ? (
        <input name="testId" type="hidden" value={initialTest.id} />
      ) : null}
      <input
        name="sections"
        type="hidden"
        value={JSON.stringify(normalizedSections)}
      />

      <div className="space-y-6">
        {initialTest ? (
          <div className="rounded-xl border border-primary/30 bg-primary-container p-4 text-sm text-on-primary-container">
            <span className="font-semibold">Editing:</span> {initialTest.title}. Existing and active attempts retain their immutable original snapshots.
          </div>
        ) : null}
        <Card>
          <CardHeader>
            <CardTitle>Mock details</CardTitle>
            <CardDescription>
              Define how this assessment appears in the student catalog.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5 md:grid-cols-2">
            <label className="space-y-2 text-sm font-semibold md:col-span-2">
              Title
              <input
                className="h-12 w-full rounded-xl border border-slate-300 px-4 font-normal"
                defaultValue={initialTest?.title ?? ""}
                name="title"
                placeholder="e.g. Core Mini Mock 1"
                required
              />
            </label>
            <label className="space-y-2 text-sm font-semibold">
              Mock type
              <select
                className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 font-normal"
                defaultValue={initialTest?.testType ?? "mini_mock"}
                name="testType"
              >
                <option value="diagnostic">Diagnostic</option>
                <option value="mini_mock">Mini mock</option>
                <option value="full_mock">Full mock</option>
                <option value="sectional">Sectional</option>
              </select>
            </label>
            <label className="space-y-2 text-sm font-semibold">
              Mock module
              <select
                className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 font-normal"
                name="module"
                onChange={(event) => changeTestModule(event.target.value)}
                value={testModule}
              >
                <option value="core">Core</option>
              </select>
            </label>
            <label className="space-y-2 text-sm font-semibold md:col-span-2">
              Description
              <textarea
                className="min-h-24 w-full rounded-2xl border border-slate-300 p-4 font-normal leading-7"
                defaultValue={initialTest?.description ?? ""}
                name="description"
                placeholder="A short catalog description."
              />
            </label>
            <label className="space-y-2 text-sm font-semibold md:col-span-2">
              Candidate instructions
              <textarea
                className="min-h-32 w-full rounded-2xl border border-slate-300 p-4 font-normal leading-7"
                defaultValue={initialTest?.instructions ?? ""}
                name="instructions"
                placeholder="Instructions shown before the timed attempt begins."
              />
            </label>
            <label className="flex items-center gap-3 rounded-2xl border border-slate-200 p-4 text-sm font-semibold">
              <input
                defaultChecked={initialTest?.isPremium ?? false}
                name="isPremium"
                type="checkbox"
              />
              Premium access required
            </label>
            <label className="flex items-center gap-3 rounded-2xl border border-slate-200 p-4 text-sm font-semibold">
              <input
                defaultChecked={initialTest?.randomizeQuestions ?? true}
                name="randomizeQuestions"
                type="checkbox"
              />
              Randomize question order
            </label>
            <label className="flex items-center gap-3 rounded-2xl border border-slate-200 p-4 text-sm font-semibold">
              <input
                defaultChecked={initialTest?.randomizeOptions ?? true}
                name="randomizeOptions"
                type="checkbox"
              />
              Randomize answer options
            </label>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <CardTitle>Question bank</CardTitle>
                <CardDescription className="mt-1">
                  Search the approved, published questions available to sections.
                </CardDescription>
              </div>
              <Badge variant="success">{questionBank.length} eligible</Badge>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            <label className="relative">
              <Search className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
              <span className="sr-only">Search questions</span>
              <input
                className="h-11 w-full rounded-xl border border-slate-300 pl-11 pr-4 text-sm"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search prompt, topic, or subtopic"
                value={search}
              />
            </label>
            <select
              aria-label="Filter question type"
              className="h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm"
              onChange={(event) => setQuestionType(event.target.value)}
              value={questionType}
            >
              <option value="all">All question types</option>
              {ADMIN_CORE_SECTION_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <select
              aria-label="Filter question difficulty"
              className="h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm"
              onChange={(event) => setDifficulty(event.target.value)}
              value={difficulty}
            >
              <option value="all">All difficulties</option>
              <option value="easy">Easy ({inventoryDifficultyCounts.easy})</option>
              <option value="medium">Medium ({inventoryDifficultyCounts.medium})</option>
              <option value="hard">Hard ({inventoryDifficultyCounts.hard})</option>
            </select>
          </CardContent>
        </Card>

        {sections.map((section, sectionIndex) => {
          const effectiveModule = section.module ?? testModule;
          const eligibleQuestions = filterMockQuestions(questionBank, {
            module: effectiveModule as "core" | null,
            sectionType: section.sectionType,
            questionType: questionType as "all" | AdminQuestionBankItem["questionType"],
            difficulty: section.sectionType !== "mixed" && section.focusDifficulty
              ? section.focusDifficulty
              : difficulty as "all" | AdminQuestionBankItem["difficulty"],
            search,
          }).slice(0, 100);
          const smartTarget = getSmartFillTargetState(
            section.smartFillCount,
            section.questionIds.length,
          );
          const smartAvailability =
            section.sectionType !== "mixed" && section.focusDifficulty
              ? getSmartFillAvailability(questionBank, {
                  questionType: section.sectionType,
                  difficulty: section.focusDifficulty,
                  excludedQuestionIds: assignedQuestionIds,
                })
              : null;
          const availableForSelection = section.allowPublishedFocusedReuse
            ? smartAvailability?.totalAvailable ?? 0
            : smartAvailability?.unusedAvailable ?? 0;
          const shortageCount = smartTarget.status === "needs_questions"
            ? Math.max(0, smartTarget.additionalCount - availableForSelection)
            : 0;
          const selectingQuestions = selectingSectionId === section.clientId;
          const autoSelectDisabled = selectingQuestions ||
            smartTarget.status === "invalid" ||
            smartTarget.status === "above_target" ||
            (!section.smartFillGenerated && (
              smartTarget.status === "at_target" || shortageCount > 0
            ));

          return (
            <Card id={`mock-section-${sectionIndex + 1}`} key={section.clientId}>
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <CardTitle>Section {sectionIndex + 1}</CardTitle>
                    <CardDescription className="mt-1">
                      {section.questionIds.length} questions ·{" "}
                      {formatMinutes(section.durationSeconds)}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      aria-label="Move section up"
                      disabled={sectionIndex === 0}
                      onClick={() => moveSection(sectionIndex, -1)}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      aria-label="Move section down"
                      disabled={sectionIndex === sections.length - 1}
                      onClick={() => moveSection(sectionIndex, 1)}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button
                      aria-label="Remove section"
                      disabled={sections.length === 1}
                      onClick={() =>
                        setSections((current) =>
                          current.filter(
                            (item) => item.clientId !== section.clientId,
                          ),
                        )
                      }
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <label className="space-y-2 text-sm font-semibold">
                    Section title
                    <input
                      className="h-11 w-full rounded-xl border border-slate-300 px-4 font-normal"
                      onChange={(event) =>
                        updateSection(section.clientId, (current) => ({
                          ...current,
                          title: event.target.value,
                        }))
                      }
                      value={section.title}
                    />
                  </label>
                  <label className="space-y-2 text-sm font-semibold">
                    Question module
                    <select
                      className="h-11 w-full rounded-xl border border-slate-300 bg-white px-4 font-normal"
                      onChange={(event) => updateSection(section.clientId, (current) => {
                        const sectionType = event.target.value as BuilderSection["sectionType"];
                        const focusDifficulty = sectionType === "mixed"
                          ? null
                          : current.focusDifficulty ?? "easy";
                        return {
                          ...current,
                          sectionType,
                          focusDifficulty,
                          smartFillGenerated: false,
                          smartFillMessage: null,
                          questionIds: current.questionIds.filter((id) => {
                            const question = questionById.get(id);
                            return sectionType === "mixed" || (
                              question?.questionType === sectionType &&
                              question.difficulty === focusDifficulty
                            );
                          }),
                        };
                      })}
                      disabled={selectingQuestions}
                      value={section.sectionType}
                    >
                      <option value="mixed">Mixed</option>
                      {ADMIN_CORE_SECTION_TYPE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-2 text-sm font-semibold">
                    Module
                    <select
                      className="h-11 w-full rounded-xl border border-slate-300 bg-white px-4 font-normal"
                      disabled={Boolean(testModule)}
                      onChange={(event) =>
                        changeSectionModule(
                          section.clientId,
                          event.target.value,
                        )
                      }
                      value={testModule || section.module || ""}
                    >
                      <option value="core">Core</option>
                    </select>
                  </label>
                  <label className="space-y-2 text-sm font-semibold">
                    Duration
                    <div className="relative">
                      <input
                        className="h-11 w-full rounded-xl border border-slate-300 px-4 pr-14 font-normal"
                        min={1}
                        onChange={(event) =>
                          updateSection(section.clientId, (current) => ({
                            ...current,
                            durationSeconds:
                              Math.max(1, Number(event.target.value) || 1) * 60,
                          }))
                        }
                        type="number"
                        value={Math.round(section.durationSeconds / 60)}
                      />
                      <span className="absolute right-4 top-3 text-xs text-slate-500">
                        min
                      </span>
                    </div>
                  </label>
                </div>

                {section.sectionType === "mixed" ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
                    Choose a specific question module to use Smart Fill. Manual selection remains available for mixed sections.
                  </div>
                ) : (
                  <div className="space-y-4 rounded-2xl border border-workspace-border bg-surface-low p-4 text-on-surface">
                    <div>
                      <p className="font-semibold text-on-surface">Smart Fill</p>
                      <p className="mt-1 text-sm text-on-surface-variant">
                        Select published questions by module and stored difficulty. Existing selections in other sections are always excluded.
                      </p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="space-y-2 text-sm font-semibold text-on-surface">
                        Difficulty
                        <select
                          className="h-11 w-full rounded-xl border border-input-border bg-input-background px-4 font-normal text-on-surface outline-none focus-visible:ring-2 focus-visible:ring-primary"
                          disabled={selectingQuestions}
                          onChange={(event) => updateSection(section.clientId, (current) => {
                            const focusDifficulty = event.target.value as AdminQuestionBankItem["difficulty"];
                            return {
                              ...current,
                              focusDifficulty,
                              smartFillGenerated: false,
                              smartFillMessage: null,
                              questionIds: current.questionIds.filter(
                                (id) => questionById.get(id)?.difficulty === focusDifficulty,
                              ),
                            };
                          })}
                          value={section.focusDifficulty ?? "easy"}
                        >
                          <option value="easy">Easy</option>
                          <option value="medium">Medium</option>
                          <option value="hard">Hard</option>
                        </select>
                      </label>
                      <label className="space-y-2 text-sm font-semibold text-on-surface">
                        Question count
                        <input
                          aria-describedby={`smart-fill-count-help-${section.clientId}`}
                          aria-invalid={smartTarget.status === "invalid"}
                          className="h-11 w-full rounded-xl border border-input-border bg-input-background px-4 font-normal text-on-surface outline-none focus-visible:ring-2 focus-visible:ring-primary"
                          disabled={selectingQuestions}
                          max={100}
                          min={1}
                          onChange={(event) => updateSection(section.clientId, (current) => ({
                            ...current,
                            smartFillCount: event.target.value,
                            smartFillGenerated: false,
                            smartFillMessage: null,
                          }))}
                          step={1}
                          type="number"
                          value={section.smartFillCount}
                        />
                      </label>
                    </div>
                    <div
                      className={[
                        "rounded-xl border p-3 text-sm",
                        smartTarget.status === "above_target"
                          ? "border-warning bg-warning-container text-warning-container-foreground"
                          : smartTarget.status === "invalid" || shortageCount > 0
                            ? "border-error bg-error-container text-error-container-foreground"
                            : smartTarget.status === "at_target"
                              ? "border-success bg-success-container text-success-container-foreground"
                              : "border-workspace-border bg-surface-lowest text-on-surface",
                      ].join(" ")}
                      id={`smart-fill-count-help-${section.clientId}`}
                      role={smartTarget.status === "invalid" || smartTarget.status === "above_target" || shortageCount > 0 ? "alert" : "status"}
                    >
                      <p className="font-medium">
                        <strong>{smartAvailability?.unusedAvailable ?? 0}</strong> unused published <span className="capitalize">{section.focusDifficulty} {smartFillLabel(section)}</span> questions available
                      </p>
                      <p className="mt-2 text-sm">
                        {smartTarget.status === "invalid"
                          ? smartTarget.message
                          : smartTarget.status === "at_target"
                            ? `Section already contains ${smartTarget.targetCount} questions.`
                            : smartTarget.status === "above_target"
                              ? `Section currently contains ${smartTarget.currentCount} questions. Remove ${smartTarget.excessCount} questions before using Smart Fill for a target of ${smartTarget.targetCount}.`
                              : shortageCount > 0
                                ? `${shortageCount} more required · ${smartTarget.targetCount} total requested`
                                : smartTarget.currentCount === 0
                                  ? `${smartTarget.targetCount} questions will be selected`
                                  : `${smartTarget.additionalCount} more questions will be selected · ${smartTarget.targetCount} total`}
                      </p>
                    </div>
                    {(smartAvailability?.totalAvailable ?? 0) > (smartAvailability?.unusedAvailable ?? 0) ? (
                      <label className="flex items-start gap-3 text-sm leading-6 text-on-surface-variant">
                        <input
                          checked={section.allowPublishedFocusedReuse}
                          className="mt-1"
                          disabled={selectingQuestions}
                          onChange={(event) => updateSection(section.clientId, (current) => ({
                            ...current,
                            allowPublishedFocusedReuse: event.target.checked,
                            smartFillMessage: null,
                          }))}
                          type="checkbox"
                        />
                        Explicitly allow reuse from published focused mocks ({smartAvailability?.totalAvailable ?? 0} total eligible).
                      </label>
                    ) : null}
                    <Button
                      className="w-full disabled:border-workspace-border disabled:bg-surface-high disabled:text-on-surface-variant disabled:opacity-100 sm:w-auto"
                      disabled={autoSelectDisabled}
                      onClick={() => void smartFillSection(section.clientId, section.smartFillGenerated)}
                      type="button"
                    >
                      <RefreshCw className="h-4 w-4" />
                      {selectingQuestions
                        ? "Selecting questions..."
                        : section.smartFillGenerated
                          ? "Regenerate selection"
                          : "Auto-select questions"}
                    </Button>
                    {!section.smartFillGenerated && shortageCount > 0 ? (
                      <p className="rounded-xl bg-error-container p-3 text-sm font-medium text-error-container-foreground" role="alert">
                        Only {availableForSelection} {section.allowPublishedFocusedReuse ? "eligible" : "unused published"} questions are available. Reduce the count, publish more questions, or explicitly allow reuse.
                      </p>
                    ) : null}
                    {section.smartFillMessage ? (
                      <p
                        className={[
                          "rounded-xl p-3 text-sm",
                          section.smartFillMessageTone === "error"
                            ? "bg-error-container text-error-container-foreground"
                            : section.smartFillMessageTone === "warning"
                              ? "bg-warning-container text-warning-container-foreground"
                              : section.smartFillMessageTone === "success"
                                ? "bg-success-container text-success-container-foreground"
                                : "border border-workspace-border bg-surface-lowest text-on-surface-variant",
                        ].join(" ")}
                        role={section.smartFillMessageTone === "error" || section.smartFillMessageTone === "warning" ? "alert" : "status"}
                      >
                        {section.smartFillMessage}
                      </p>
                    ) : null}
                  </div>
                )}

                {section.questionIds.length ? (
                  <div>
                    <p className="mb-3 text-sm font-semibold">
                      Selected Questions — {section.questionIds.length}
                    </p>
                    <div className="space-y-2">
                      {section.questionIds.map((questionId, index) => {
                        const question = questionById.get(questionId);
                        return (
                          <div
                            className="flex items-center gap-3 rounded-xl bg-blue-50 p-3 text-sm"
                            key={questionId}
                          >
                            <span className="font-semibold text-blue-800">
                              {index + 1}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate">
                                {question?.questionText ?? "Unavailable / Deleted question—replace before saving"}
                              </span>
                              <span className="mt-1 block text-xs text-slate-500">
                                {question
                                  ? `${question.questionType.replaceAll("_", " ")} · ${question.difficulty} · ${question.id.slice(0, 8)}`
                                  : questionId.slice(0, 8)}
                              </span>
                            </span>
                            {section.sectionType !== "mixed" && section.focusDifficulty ? (
                              <button
                                aria-label="Replace assigned question"
                                className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-blue-800 hover:bg-white"
                                disabled={selectingQuestions}
                                onClick={() => replaceQuestion(section.clientId, questionId)}
                                type="button"
                              >
                                <RefreshCw className="h-3.5 w-3.5" />
                                Replace
                              </button>
                            ) : null}
                            <button
                              aria-label="Move question up"
                              className="rounded-lg p-1 text-slate-500 hover:bg-white disabled:opacity-30"
                              disabled={selectingQuestions || index === 0}
                              onClick={() =>
                                moveQuestion(section.clientId, index, -1)
                              }
                              type="button"
                            >
                              <ArrowUp className="h-4 w-4" />
                            </button>
                            <button
                              aria-label="Move question down"
                              className="rounded-lg p-1 text-slate-500 hover:bg-white disabled:opacity-30"
                              disabled={
                                selectingQuestions ||
                                index === section.questionIds.length - 1
                              }
                              onClick={() =>
                                moveQuestion(section.clientId, index, 1)
                              }
                              type="button"
                            >
                              <ArrowDown className="h-4 w-4" />
                            </button>
                            <button
                              aria-label="Remove assigned question"
                              className="rounded-lg p-1 text-slate-500 hover:bg-white"
                              disabled={selectingQuestions}
                              onClick={() =>
                                toggleQuestion(
                                  section.clientId,
                                  questionId,
                                  false,
                                )
                              }
                              type="button"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null}

                <div>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold">Add questions</p>
                    <p className="text-xs text-slate-500">
                      Showing {eligibleQuestions.length}
                    </p>
                  </div>
                  <div className="max-h-[440px] space-y-2 overflow-y-auto pr-1">
                    {eligibleQuestions.map((question) => {
                      const selectedHere =
                        section.questionIds.includes(question.id);
                      const selectedElsewhere =
                         !selectedHere && assignedQuestionIds.has(question.id);
                       const protectedFromReuse = Boolean(
                         !selectedHere &&
                         question.usedInPublishedFocusedMock &&
                         !section.allowPublishedFocusedReuse,
                       );
                      return (
                        <label
                          className={[
                            "flex cursor-pointer gap-3 rounded-2xl border p-4",
                            selectedHere
                              ? "border-blue-300 bg-blue-50"
                              : "border-slate-200",
                            selectedElsewhere || protectedFromReuse
                              ? "cursor-not-allowed opacity-50"
                              : "hover:border-blue-200",
                          ].join(" ")}
                          key={question.id}
                        >
                          <input
                            checked={selectedHere}
                            disabled={selectingQuestions || selectedElsewhere || protectedFromReuse}
                            onChange={(event) =>
                              toggleQuestion(
                                section.clientId,
                                question.id,
                                event.target.checked,
                              )
                            }
                            type="checkbox"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="line-clamp-2 text-sm font-medium leading-6">
                              {question.questionText}
                            </span>
                            <span className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                              <span>{question.topic}</span>
                              <span>·</span>
                              <span>{question.difficulty}</span>
                              <span>·</span>
                              <span>{question.module.replace("_", " ")}</span>
                               {selectedElsewhere ? (
                                <>
                                  <span>·</span>
                                  <span className="font-semibold text-blue-700">
                                    Used in another section
                                  </span>
                                </>
                               ) : null}
                               {protectedFromReuse ? (
                                 <>
                                   <span>Â·</span>
                                   <span className="font-semibold text-amber-700">
                                     Used in a published focused mock
                                   </span>
                                 </>
                               ) : null}
                            </span>
                          </span>
                        </label>
                      );
                    })}
                    {!eligibleQuestions.length ? (
                      <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                        No eligible questions match these filters.
                      </p>
                    ) : null}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        <Button
          onClick={() =>
            setSections((current) => [...current, newSection(current.length)])
          }
          type="button"
          variant="secondary"
        >
          <Plus className="h-4 w-4" />
          Add section
        </Button>

        {state.message ? (
          <div
            className={
              state.status === "success"
                ? "rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-800"
                : "rounded-2xl bg-red-50 p-4 text-sm text-red-800"
            }
            role={state.status === "error" ? "alert" : "status"}
          >
            {state.message}
            {state.diagnostic ? (
              <div className="mt-3 rounded-xl border border-red-200 bg-white/60 p-3 text-xs">
                <p><span className="font-semibold">Failure stage:</span> {state.diagnostic.failureStage.replaceAll("_", " ")}</p>
                <p className="mt-1"><span className="font-semibold">Section:</span> {state.diagnostic.sectionType?.replaceAll("_", " ") ?? "Not section-specific"}{state.diagnostic.sectionIndex ? ` (${state.diagnostic.sectionIndex})` : ""}</p>
                <p className="mt-1"><span className="font-semibold">Question count:</span> {state.diagnostic.questionCount}</p>
                {state.diagnostic.databaseErrorCode ? <p className="mt-1"><span className="font-semibold">Safe error code:</span> <span className="font-mono">{state.diagnostic.databaseErrorCode}</span></p> : null}
                {state.diagnostic.constraintName ? <p className="mt-1"><span className="font-semibold">Constraint:</span> <span className="font-mono">{state.diagnostic.constraintName}</span></p> : null}
                {state.diagnostic.sectionIndex ? <Button className="mt-3" onClick={() => document.getElementById(`mock-section-${state.diagnostic?.sectionIndex}`)?.scrollIntoView({ behavior: "smooth", block: "start" })} size="sm" type="button" variant="outline">Review section</Button> : null}
              </div>
            ) : null}
            {state.testId ? (
              <span className="mt-2 block">
                <Link
                  className="font-semibold underline"
                  href={"/admin/tests" as Route}
                >
                  Open Created Mocks
                </Link>
              </span>
            ) : null}
          </div>
        ) : null}

        <div className="flex flex-wrap justify-end gap-3">
          {initialTest ? (
            <Button
              disabled={pending}
              name="intent"
              type="submit"
              value={initialTest.isPublished ? "publish" : "draft"}
            >
              <Save className="h-4 w-4" />
              {pending ? "Saving changes..." : "Save Changes"}
            </Button>
          ) : <><Button
            disabled={pending}
            name="intent"
            type="submit"
            value="draft"
            variant="secondary"
          >
            <Save className="h-4 w-4" />
            {pending ? "Saving..." : "Save Mock"}
          </Button>
          <Button
            disabled={pending}
            name="intent"
            type="submit"
            value="publish"
          >
            <Send className="h-4 w-4" />
            {pending ? "Publishing..." : "Save and Publish Mock"}
          </Button>
          </>}
        </div>
      </div>

      <aside className="h-fit xl:sticky xl:top-28">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-blue-700" />
              <CardTitle>Mock composition</CardTitle>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-xl border border-slate-200 p-2"><p className="text-base font-semibold">{composition.difficulty.easy}</p><p className="text-slate-500">Easy</p></div>
              <div className="rounded-xl border border-slate-200 p-2"><p className="text-base font-semibold">{composition.difficulty.medium}</p><p className="text-slate-500">Medium</p></div>
              <div className="rounded-xl border border-slate-200 p-2"><p className="text-base font-semibold">{composition.difficulty.hard}</p><p className="text-slate-500">Hard</p></div>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between gap-3"><span>Figure Sequences</span><strong>{composition.questionType.figure_sequence}</strong></div>
              <div className="flex justify-between gap-3"><span>Mathematical Equations</span><strong>{composition.questionType.mathematical_equation}</strong></div>
              <div className="flex justify-between gap-3"><span>Latin Squares</span><strong>{composition.questionType.latin_square}</strong></div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-slate-50 p-3 text-center">
                <Layers3 className="mx-auto h-4 w-4 text-blue-700" />
                <p className="mt-2 text-lg font-semibold">{sections.length}</p>
                <p className="text-xs text-slate-500">Sections</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 text-center">
                <FileQuestion className="mx-auto h-4 w-4 text-blue-700" />
                <p className="mt-2 text-lg font-semibold">{totalQuestions}</p>
                <p className="text-xs text-slate-500">Questions</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 text-center">
                <Clock3 className="mx-auto h-4 w-4 text-blue-700" />
                <p className="mt-2 text-lg font-semibold">
                  {Math.round(totalDurationSeconds / 60)}
                </p>
                <p className="text-xs text-slate-500">Minutes</p>
              </div>
            </div>
            <div className="space-y-3">
              {sections.map((section, index) => (
                <div
                  className="rounded-xl border border-slate-200 p-3"
                  key={section.clientId}
                >
                  <p className="text-sm font-semibold">
                    {index + 1}. {section.title || "Untitled section"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {section.questionIds.length} questions ·{" "}
                    {formatMinutes(section.durationSeconds)}
                  </p>
                </div>
              ))}
            </div>
            <p className="text-xs leading-5 text-slate-500">
              Publishing makes the mock immediately visible in the student
              catalog. Only approved and published questions are accepted.
            </p>
          </CardContent>
        </Card>
      </aside>
    </form>
  );
}
