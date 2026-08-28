"use client";

import {
  ArrowDown,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  XCircle,
} from "lucide-react";
import { type ReactNode, useId, useReducer } from "react";

import { Button } from "@/components/ui/button";
import {
  explanationNavigationReducer,
} from "@/lib/practice/explanation-navigation";
import { cn } from "@/lib/utils";

export function PracticeExplanationShell<Step>({
  isCorrect,
  resultDetails,
  steps,
  fallbackMessage,
  renderVisual,
  renderStep,
  getStepKey,
  initiallyOpen = false,
  initialView = "step",
  initialStep = 0,
  dataFeedbackInterface,
  showOutcomeHeader = true,
  onExplanationOpen,
  quickSummary,
  observation,
  answerConclusion,
  mistakeFeedback,
  takeaway,
}: {
  isCorrect: boolean;
  resultDetails: ReactNode;
  steps: readonly Step[];
  fallbackMessage: string | null;
  renderVisual(step: Step, index: number, all: boolean): ReactNode;
  renderStep(step: Step, index: number, total: number): ReactNode;
  getStepKey(step: Step, index: number): string;
  initiallyOpen?: boolean;
  initialView?: "step" | "all";
  initialStep?: number;
  dataFeedbackInterface?: string;
  showOutcomeHeader?: boolean;
  onExplanationOpen?: () => void;
  quickSummary?: string;
  observation?: string;
  answerConclusion?: string;
  mistakeFeedback?: { title: string; description: string; supported: boolean } | null;
  takeaway?: string;
}) {
  const [state, dispatch] = useReducer(explanationNavigationReducer, {
    open: initiallyOpen,
    view: initialView,
    stepIndex: Math.min(Math.max(0, steps.length - 1), Math.max(0, initialStep)),
  });
  const currentStep = steps[state.stepIndex];
  const walkthroughId = useId();

  return (
    <section
      className="overflow-hidden rounded-xl border border-workspace-border bg-surface-lowest"
      data-feedback-interface={dataFeedbackInterface}
    >
      <div className="p-5 sm:p-6">
        {showOutcomeHeader ? (
          <div className="flex items-start gap-3">
            {isCorrect ? (
              <CheckCircle2 aria-hidden="true" className="mt-0.5 h-6 w-6 shrink-0 text-success" />
            ) : (
              <XCircle aria-hidden="true" className="mt-0.5 h-6 w-6 shrink-0 text-error" />
            )}
            <div className="min-w-0 flex-1">
              <h3 className="text-lg font-semibold text-on-surface">
                {isCorrect ? "Correct!" : "Not quite"}
              </h3>
              <div className="mt-3">{resultDetails}</div>
            </div>
          </div>
        ) : resultDetails}
        {quickSummary ? (
          <div className="mt-4 rounded-lg border border-primary/30 bg-primary-muted px-4 py-3" data-explanation-level="quick">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">Quick explanation</p>
            <p className="mt-1 text-sm leading-6 text-on-surface">{quickSummary}</p>
          </div>
        ) : null}
        {!isCorrect && mistakeFeedback ? (
          <div className="mt-3 rounded-lg border border-warning bg-warning-container px-4 py-3" data-diagnosis-supported={mistakeFeedback.supported}>
            <p className="text-sm font-semibold text-warning-container-foreground">{mistakeFeedback.title}</p>
            <p className="mt-1 text-sm leading-6 text-warning-container-foreground">{mistakeFeedback.description}</p>
          </div>
        ) : null}
        <Button
          aria-controls={walkthroughId}
          aria-expanded={state.open}
          className="mt-5"
          onClick={() => {
            if (!state.open) onExplanationOpen?.();
            dispatch({ type: state.open ? "close" : "open" });
          }}
          type="button"
          variant="secondary"
        >
          <Eye aria-hidden="true" className="h-4 w-4" />
          {state.open
            ? "Hide walkthrough"
            : isCorrect ? "See how it works" : "Show me how to solve it"}
        </Button>
      </div>

      {state.open ? (
        <div className="border-t border-workspace-separator bg-surface-low p-5 sm:p-6" id={walkthroughId}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                How to solve it
              </p>
              <h4 className="mt-1 text-xl font-semibold text-on-surface">
                Follow the reasoning
              </h4>
            </div>
            {steps.length > 1 ? (
              <Button
                onClick={() => dispatch(
                  state.view === "all"
                    ? { type: "show_step", stepCount: steps.length }
                    : { type: "show_all" },
                )}
                type="button"
                variant="ghost"
              >
                {state.view === "all" ? "Show one step at a time" : "Show all steps"}
              </Button>
            ) : null}
          </div>
          {observation ? (
            <div className="mt-4 rounded-lg border border-workspace-border bg-surface-lowest px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">What to notice</p>
              <p className="mt-1 text-sm leading-6 text-on-surface">{observation}</p>
            </div>
          ) : null}

          {currentStep ? (
            state.view === "all" ? (
              <div className="mt-5 grid items-start gap-6 lg:grid-cols-[minmax(280px,390px)_minmax(0,1fr)]">
                {renderVisual(steps[steps.length - 1], steps.length - 1, true)}
                <ol className="space-y-3" data-walkthrough-view="all">
                  {steps.map((step, index) => (
                    <li key={getStepKey(step, index)}>
                      {renderStep(step, index, steps.length)}
                      {index < steps.length - 1 ? (
                        <ArrowDown aria-hidden="true" className="mx-auto my-2 h-4 w-4 text-muted-foreground" />
                      ) : null}
                    </li>
                  ))}
                </ol>
              </div>
            ) : (
              <div className="mt-5 grid items-start gap-6 lg:grid-cols-[minmax(280px,390px)_minmax(0,1fr)]">
                {renderVisual(currentStep, state.stepIndex, false)}
                <div>
                  <ExplanationProgress current={state.stepIndex} count={steps.length} />
                  {renderStep(currentStep, state.stepIndex, steps.length)}
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <Button
                      disabled={state.stepIndex === 0}
                      onClick={() => dispatch({ type: "previous" })}
                      type="button"
                      variant="secondary"
                    >
                      <ChevronLeft aria-hidden="true" className="h-4 w-4" />
                      Previous
                    </Button>
                    <span className="text-xs font-semibold text-muted-foreground" aria-live="polite">
                      Step {state.stepIndex + 1} of {steps.length}
                    </span>
                    <Button
                      disabled={state.stepIndex === steps.length - 1}
                      onClick={() => dispatch({ type: "next", stepCount: steps.length })}
                      type="button"
                    >
                      Next
                      <ChevronRight aria-hidden="true" className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )
          ) : (
            <p className="mt-5 rounded-md border border-workspace-border bg-surface-lowest p-4 text-sm leading-6 text-on-surface">
              {fallbackMessage}
            </p>
          )}
          {answerConclusion || takeaway ? (
            <aside className="mt-5 rounded-lg border border-success/40 bg-success-container px-4 py-3" aria-label="Answer and takeaway">
              {answerConclusion ? <p className="text-sm font-semibold text-success-container-foreground">{answerConclusion}</p> : null}
              {takeaway ? (
                <p className="mt-2 text-sm leading-6 text-success-container-foreground">
                  <span className="font-semibold">Remember:</span> {takeaway}
                </p>
              ) : null}
            </aside>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

export function ExplanationProgress({ current, count }: { current: number; count: number }) {
  return (
    <div
      aria-label={`Step ${current + 1} of ${count}`}
      className="mb-3 flex items-center gap-1.5"
      role="img"
    >
      {Array.from({ length: count }, (_, index) => (
        <span
          aria-hidden="true"
          className={cn(
            "h-2 rounded-full transition-[width,background-color] motion-reduce:transition-none",
            index === current ? "w-6 bg-primary" : index < current ? "w-2 bg-success" : "w-2 bg-workspace-border",
          )}
          key={index}
        />
      ))}
    </div>
  );
}
