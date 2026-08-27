"use client";

import { CheckCircle2, Sparkles, Trash2, Upload } from "lucide-react";
import { FormEvent, useRef, useState, useTransition } from "react";

import {
  generateEquationPreviewAction,
  generateFigurePreviewAction,
  generateLatinPreviewAction,
  publishGeneratedEquationAction,
  publishGeneratedFigureAction,
  publishGeneratedLatinAction,
  publishGeneratedQuestionsAction,
} from "@/app/admin/actions";
import { QuestionRenderer } from "@/components/questions/question-renderer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type {
  FigureSequenceQuestion,
  GenerationDifficulty,
  LatinSquareQuestion,
  MathematicalEquationQuestion,
} from "@/lib/generation";
import {
  generatedPublishFailureMessage,
  type GeneratedBatchItemResult,
} from "@/lib/admin/generated-batch";

type GeneratedPreview = MathematicalEquationQuestion | LatinSquareQuestion | FigureSequenceQuestion;
type GenerationQuestionType = GeneratedPreview["questionType"];

export function UnifiedQuestionGenerator() {
  const [questionType, setQuestionType] = useState<GenerationQuestionType>("mathematical_equation");
  const [difficulty, setDifficulty] = useState<GenerationDifficulty>("easy");
  const [quantity, setQuantity] = useState(3);
  const [seed, setSeed] = useState("");
  const [baseSeed, setBaseSeed] = useState<string | null>(null);
  const [questions, setQuestions] = useState<GeneratedPreview[]>([]);
  const [publishedIds, setPublishedIds] = useState<Record<string, string>>({});
  const [publishingFingerprint, setPublishingFingerprint] = useState<string | null>(null);
  const [batchFailures, setBatchFailures] = useState<Record<string, GeneratedBatchItemResult>>({});
  const [publishAllOpen, setPublishAllOpen] = useState(false);
  const [discardAllOpen, setDiscardAllOpen] = useState(false);
  const [isBatchPublishing, setIsBatchPublishing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const batchRequestActive = useRef(false);

  const readyQuestions = questions.filter((question) => !publishedIds[question.metadata.fingerprint]);
  const firstFailedFingerprint = Object.keys(batchFailures)[0];
  const failedResults = Object.values(batchFailures);

  function provenance(question: GeneratedPreview) {
    return {
      questionType: question.questionType,
      seed: question.metadata.seed,
      difficulty: question.metadata.requestedDifficulty,
      attemptCount: question.metadata.attemptCount,
      fingerprint: question.metadata.fingerprint,
    };
  }

  function generate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const request = { difficulty, quantity, seed };
      const response = questionType === "latin_square"
        ? await generateLatinPreviewAction(request)
        : questionType === "figure_sequence"
          ? await generateFigurePreviewAction(request)
          : await generateEquationPreviewAction(request);
      if (response.error || !response.questions) {
        setError(response.error ?? "Unable to generate question previews.");
        return;
      }
      setQuestions(response.questions);
      setPublishedIds({});
      setBatchFailures({});
      setBaseSeed(response.baseSeed);
    });
  }

  function publish(question: GeneratedPreview) {
    setError(null);
    setMessage(null);
    setPublishingFingerprint(question.metadata.fingerprint);
    startTransition(async () => {
      const publishInput = provenance(question);
      const response = question.questionType === "latin_square"
        ? await publishGeneratedLatinAction(publishInput)
        : question.questionType === "figure_sequence"
          ? await publishGeneratedFigureAction(publishInput)
          : await publishGeneratedEquationAction(publishInput);
      setPublishingFingerprint(null);
      if (response.error || !("questionId" in response) || !response.questionId) {
        if ("result" in response && response.result) {
          setBatchFailures((current) => ({
            ...current,
            [question.metadata.fingerprint]: response.result,
          }));
        }
        setError(response.error ?? "Unable to publish this question.");
        return;
      }
      setPublishedIds((current) => ({
        ...current,
        [question.metadata.fingerprint]: response.questionId,
      }));
      setBatchFailures((current) => {
        const next = { ...current };
        delete next[question.metadata.fingerprint];
        return next;
      });
      setMessage("Question published successfully.");
    });
  }

  function publishAll() {
    if (batchRequestActive.current || !readyQuestions.length) return;
    batchRequestActive.current = true;
    setPublishAllOpen(false);
    setIsBatchPublishing(true);
    setError(null);
    setMessage(null);
    const requested = readyQuestions.map(provenance);
    startTransition(async () => {
      try {
        const response = await publishGeneratedQuestionsAction(requested);
        if (response.error) {
          setError(response.error);
          return;
        }
        const successful = response.results.filter(
          (result) => (result.status === "published" || result.status === "already_published") && result.questionId,
        );
        setPublishedIds((current) => ({
          ...current,
          ...Object.fromEntries(successful.map((result) => [result.id, result.questionId!])),
        }));
        const failures = Object.fromEntries(
          response.results
            .filter((result) => result.status === "failed")
            .map((result) => [result.id, result]),
        );
        setBatchFailures(failures);
        const available = response.published + response.alreadyPublished;
        if (available > 0) {
          setMessage(`${available} question${available === 1 ? "" : "s"} published successfully.`);
        }
        if (response.failed > 0) {
          setError(`${response.failed} question${response.failed === 1 ? "" : "s"} could not be published.`);
        }
      } finally {
        batchRequestActive.current = false;
        setIsBatchPublishing(false);
      }
    });
  }

  function discard(fingerprint: string) {
    if (publishedIds[fingerprint]) return;
    setQuestions((current) => current.filter((question) => question.metadata.fingerprint !== fingerprint));
    setBatchFailures((current) => {
      const next = { ...current };
      delete next[fingerprint];
      return next;
    });
    setError(null);
    setMessage("Unpublished preview discarded.");
  }

  function discardAll() {
    setQuestions((current) => current.filter((question) => publishedIds[question.metadata.fingerprint]));
    setBatchFailures({});
    setDiscardAllOpen(false);
    setError(null);
    setMessage("All unpublished previews were discarded.");
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Generation configuration</CardTitle>
          <CardDescription>
            Generation and validation run server-side. A fixed seed reproduces the same Core candidate sequence.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-5 md:grid-cols-2 xl:grid-cols-5 xl:items-end" onSubmit={generate}>
            <label className="space-y-2 text-sm font-medium">
              Question type
              <select className="h-10 w-full rounded-md border border-input-border bg-input-background px-3 text-sm" disabled={isPending} onChange={(event) => { setQuestionType(event.target.value as GenerationQuestionType); setQuestions([]); setPublishedIds({}); }} value={questionType}>
                <option value="mathematical_equation">Mathematical Equations</option>
                <option value="latin_square">Latin Squares</option>
                <option value="figure_sequence">Figure Sequences</option>
              </select>
            </label>
            <label className="space-y-2 text-sm font-medium">
              Difficulty
              <select className="h-10 w-full rounded-md border border-input-border bg-input-background px-3 text-sm" disabled={isPending} onChange={(event) => setDifficulty(event.target.value as GenerationDifficulty)} value={difficulty}>
                <option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option>
              </select>
            </label>
            <label className="space-y-2 text-sm font-medium">Quantity<Input disabled={isPending} max={20} min={1} onChange={(event) => setQuantity(Number(event.target.value))} required type="number" value={quantity} /></label>
            <label className="space-y-2 text-sm font-medium">Optional seed<Input disabled={isPending} maxLength={200} onChange={(event) => setSeed(event.target.value)} placeholder="Leave blank for a generated seed" value={seed} /></label>
            <Button disabled={isPending} type="submit"><Sparkles className="h-4 w-4" />{isPending && !publishingFingerprint && !isBatchPublishing ? "Generating…" : questions.length ? "Generate Another" : quantity === 1 ? "Generate Question" : `Generate ${quantity} Questions`}</Button>
          </form>
          {error ? <div className="mt-4 rounded-md border border-error bg-error-container p-3 text-sm text-error-container-foreground" role="alert"><div className="flex flex-wrap items-center justify-between gap-3"><p>{error}</p>{firstFailedFingerprint ? <Button onClick={() => document.getElementById(`generated-${firstFailedFingerprint}`)?.scrollIntoView({ behavior: "smooth", block: "start" })} size="sm" variant="outline">Review failed questions</Button> : null}</div>{failedResults.length ? <ul className="mt-3 space-y-1 border-t border-error/30 pt-3">{failedResults.slice(0, 5).map((result) => <li key={result.id}><span className="font-semibold">{result.questionType?.replaceAll("_", " ") ?? "Question"}</span> — {generatedPublishFailureMessage(result.reason)} <span className="font-mono text-xs">({result.reason})</span></li>)}</ul> : null}</div> : null}
          {message ? <p className="mt-4 rounded-md border border-success bg-success-container p-3 text-sm text-success-container-foreground" role="status">{message}</p> : null}
        </CardContent>
      </Card>

      {questions.length ? (
        <section className="space-y-4" aria-labelledby="preview-heading">
          <div className="sticky top-16 z-20 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-workspace-border bg-surface-lowest/95 p-4 shadow-sm backdrop-blur">
            <div><h2 className="text-xl font-semibold" id="preview-heading">Generated questions</h2><p className="mt-1 text-sm text-muted-foreground">{questions.length} generated · {questions.length} valid · {readyQuestions.length} ready to publish · Base seed: <span className="font-mono">{baseSeed}</span></p></div>
            <div className="flex flex-wrap gap-2">
              <Button disabled={isPending || readyQuestions.length === 0} onClick={() => setDiscardAllOpen(true)} variant="outline"><Trash2 className="h-4 w-4" />Discard All</Button>
              <Button disabled={isPending || readyQuestions.length === 0} onClick={() => setPublishAllOpen(true)}><Upload className="h-4 w-4" />{isBatchPublishing ? "Publishing…" : `Publish All (${readyQuestions.length})`}</Button>
            </div>
          </div>
          {questions.map((question, index) => {
            const publishedId = publishedIds[question.metadata.fingerprint];
            const publishFailure = batchFailures[question.metadata.fingerprint];
            const label = question.questionType === "latin_square" ? "Latin square" : question.questionType === "figure_sequence" ? "Figure sequence" : "Equation";
            return (
              <Card id={`generated-${question.metadata.fingerprint}`} key={question.metadata.fingerprint}>
                <CardHeader>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap gap-2"><Badge>{label} {index + 1}</Badge><Badge variant="subtle">{question.metadata.calculatedDifficulty}</Badge><Badge variant="success">Validated</Badge>{publishedId ? <Badge variant="success">Published</Badge> : <Badge variant="subtle">Preview only</Badge>}</div>
                    {publishedId ? <span className="break-all font-mono text-xs text-muted-foreground">Question ID: {publishedId}</span> : null}
                  </div>
                  <CardTitle className="pt-2">{question.presentation.prompt}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <QuestionRenderer question={question} />
                  <div className="grid gap-2 rounded-md border border-success bg-success-container p-4 text-sm text-success-container-foreground sm:grid-cols-3">
                    <span><CheckCircle2 className="mr-1 inline h-4 w-4" />Solver verified</span>
                    <span><CheckCircle2 className="mr-1 inline h-4 w-4" />Unique answer</span>
                    <span><CheckCircle2 className="mr-1 inline h-4 w-4" />Difficulty valid</span>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {[["Seed", question.metadata.seed], ["Attempt", String(question.metadata.attemptCount)], ["Generator", question.metadata.generatorVersion], ["Validator", question.metadata.validatorVersion]].map(([labelText, value]) => <div className="rounded-md bg-surface-low p-3" key={labelText}><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{labelText}</p><p className="mt-1 break-all font-mono text-xs">{value}</p></div>)}
                  </div>
                  <div className="rounded-md border border-success bg-success-container p-4">
                    <p className="text-sm font-semibold text-success-container-foreground">Verified solution</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {question.questionType === "latin_square" ? <span className="rounded-md bg-surface-lowest px-3 py-2 font-mono text-sm font-semibold">Target = {question.correctAnswer}</span> : question.questionType === "figure_sequence" ? question.sequence.missingMatrices.map((matrix, missingIndex) => { const correct = matrix.candidates.find((candidate) => candidate.id === question.correctAnswer[missingIndex]); return <span className="rounded-md bg-surface-lowest px-3 py-2 font-mono text-sm font-semibold" key={matrix.sequenceIndex}>Matrix {missingIndex + 1} = {correct?.label ?? "Unknown"}</span>; }) : Object.entries(question.correctAnswer).sort(([first], [second]) => first.localeCompare(second)).map(([symbol, value]) => <span className="rounded-md bg-surface-lowest px-3 py-2 font-mono text-sm font-semibold" key={symbol}>{symbol} = {value}</span>)}
                    </div>
                  </div>
                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-md bg-surface-low p-4"><p className="text-sm font-semibold">Explanation</p><p className="mt-2 whitespace-pre-line text-sm leading-7 text-on-surface-variant">{question.explanation}</p></div>
                    <div className="rounded-md bg-surface-low p-4"><p className="text-sm font-semibold">Validation diagnostics</p><ul className="mt-2 space-y-2 text-sm">{question.validation.checks.map((check, checkIndex) => <li className="flex items-center justify-between gap-3" key={`${check.validatorVersion}-${check.stage}-${checkIndex}`}><span className="capitalize">{check.stage}</span><Badge variant={check.passed ? "success" : "warning"}>{check.passed ? "Passed" : "Failed"}</Badge></li>)}</ul><p className="mt-4 break-all font-mono text-xs text-muted-foreground">{question.metadata.fingerprint}</p>{publishedId ? <p className="mt-2 break-all text-xs text-success">Published ID: {publishedId}</p> : <p className="mt-2 text-xs text-muted-foreground">Not saved and not eligible for student delivery.</p>}</div>
                  </div>
                  {publishFailure ? <div className="rounded-md border border-error bg-error-container p-4 text-sm text-error-container-foreground" role="alert"><p className="font-semibold">Publish review</p><p className="mt-2">{generatedPublishFailureMessage(publishFailure.reason)}</p><dl className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3"><div><dt className="font-semibold">Module</dt><dd>{label}</dd></div><div><dt className="font-semibold">Difficulty</dt><dd className="capitalize">{publishFailure.difficulty ?? question.metadata.requestedDifficulty}</dd></div><div><dt className="font-semibold">Question ID</dt><dd className="break-all font-mono text-xs">{publishFailure.questionId ?? publishFailure.id}</dd></div><div><dt className="font-semibold">Current status</dt><dd className="capitalize">{(publishFailure.currentStatus ?? "preview").replaceAll("_", " ")}</dd></div><div><dt className="font-semibold">Validation</dt><dd className="capitalize">{(publishFailure.validationState ?? "not_checked").replaceAll("_", " ")}</dd></div><div><dt className="font-semibold">Publish eligibility</dt><dd className="capitalize">{(publishFailure.publishEligibility ?? "unknown").replaceAll("_", " ")}</dd></div><div className="sm:col-span-2 lg:col-span-3"><dt className="font-semibold">Failure reason</dt><dd><span className="font-mono text-xs">{publishFailure.reason}</span></dd></div></dl></div> : null}
                  <div className="flex flex-wrap justify-end gap-3 border-t border-workspace-separator pt-5">
                    <Button disabled={isPending || Boolean(publishedId)} onClick={() => discard(question.metadata.fingerprint)} variant="outline"><Trash2 className="h-4 w-4" />Discard</Button>
                    <Button disabled={isPending || Boolean(publishedId)} onClick={() => publish(question)}><Upload className="h-4 w-4" />{publishedId ? <><CheckCircle2 className="h-4 w-4" />Published</> : publishingFingerprint === question.metadata.fingerprint ? "Publishing…" : publishFailure ? "Retry Publish" : "Publish Question"}</Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </section>
      ) : null}

      <Dialog onOpenChange={setPublishAllOpen} open={publishAllOpen} title={`Publish ${readyQuestions.length} questions?`}>
        <p className="text-sm leading-6 text-muted-foreground">They will become available for new Practice sessions and Mock Builder selection.</p>
        <div className="mt-5 flex justify-end gap-3"><Button disabled={isPending} onClick={() => setPublishAllOpen(false)} variant="ghost">Cancel</Button><Button disabled={isPending || readyQuestions.length === 0} onClick={publishAll}>{isBatchPublishing ? "Publishing…" : "Publish All"}</Button></div>
      </Dialog>

      <Dialog onOpenChange={setDiscardAllOpen} open={discardAllOpen} title={`Discard ${readyQuestions.length} unpublished previews?`}>
        <p className="text-sm leading-6 text-muted-foreground">Published questions will be kept. Discarded previews are removed from this page and are not added to the question bank.</p>
        <div className="mt-5 flex justify-end gap-3"><Button disabled={isPending} onClick={() => setDiscardAllOpen(false)} variant="ghost">Cancel</Button><Button disabled={isPending || readyQuestions.length === 0} onClick={discardAll} variant="destructive">Discard All</Button></div>
      </Dialog>
    </div>
  );
}
