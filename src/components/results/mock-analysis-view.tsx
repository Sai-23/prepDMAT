import type { Route } from "next";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Clock3, Target, XCircle } from "lucide-react";

import { ResultReview } from "@/components/results/result-review";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatStudyTime } from "@/lib/dashboard/recommendations";
import type { MockAnalysis, MockSectionAnalysis } from "@/lib/results/mock-analysis";
import type { AttemptResult } from "@/lib/results/schemas";

function percent(value: number | null) {
  return value === null ? "—" : `${value.toFixed(1)}%`;
}

export function MockAnalysisView({
  result,
  analysis,
}: {
  result: AttemptResult;
  analysis: MockAnalysis;
}) {
  if (!analysis.eligible) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="grid gap-5 p-6 sm:grid-cols-3">
            <Metric label="Correct" value={`${analysis.overall.correct} / ${analysis.overall.total}`} />
            <Metric label="Accuracy" value={percent(analysis.overall.scoreAccuracy)} />
            <Metric label="Recorded study time" value={formatStudyTime(result.totalTimeSeconds)} />
          </CardContent>
        </Card>
        <div className="rounded-md border border-warning bg-warning-container p-4 text-sm text-warning-container-foreground" role="status">
          {analysis.limitation}
        </div>
        <section aria-labelledby="question-review" className="space-y-4">
          <SectionHeading id="question-review" title="Question review" description="The saved questions and explanations remain available for review." />
          <ResultReview questions={result.questions} />
        </section>
      </div>
    );
  }

  const timingCounts = analysis.questionAnalysis.reduce(
    (counts, question) => {
      counts[question.timing] += 1;
      return counts;
    },
    { fast_correct: 0, fast_incorrect: 0, slow_correct: 0, slow_incorrect: 0, typical: 0, unavailable: 0 },
  );
  const recommended = analysis.recommendations[0];

  return (
    <div className="space-y-10">
      <section aria-labelledby="result-summary" className="space-y-4">
        <Card className="overflow-hidden">
          <div className="grid bg-primary text-primary-foreground lg:grid-cols-[300px_1fr]">
            <div className="flex flex-col justify-center border-primary-foreground/20 p-7 lg:border-r">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] opacity-80" id="result-summary">Result</p>
              <p className="mt-3 text-5xl font-semibold">{analysis.overall.correct} / {analysis.overall.total}</p>
              <p className="mt-2 text-sm opacity-90">{percent(analysis.overall.scoreAccuracy)} mock accuracy</p>
              <p className="mt-1 text-xs opacity-75">Practice result — not an official dMAT score</p>
            </div>
            <div className="grid gap-4 p-6 sm:grid-cols-2 xl:grid-cols-4">
              <Metric dark label="Incorrect" value={analysis.overall.incorrect} icon="incorrect" />
              <Metric dark label="Unanswered" value={analysis.overall.unanswered} icon="unanswered" />
              <Metric dark label="Recorded study time" value={formatStudyTime(result.totalTimeSeconds)} icon="time" />
              <div className="rounded-md border border-primary-foreground/20 bg-primary-muted p-4">
                <p className="text-xs opacity-80">Mock type</p>
                <p className="mt-2 font-semibold">{analysis.origin === "generated" ? "Full Core" : "Custom"}</p>
                {analysis.autoSubmitted ? <Badge className="mt-3" variant="warning">Auto-submitted</Badge> : null}
              </div>
            </div>
          </div>
        </Card>
      </section>

      <section aria-labelledby="section-performance" className="space-y-4">
        <SectionHeading id="section-performance" title="Section performance" description="Your result by Core section and question difficulty." />
        <div className="grid gap-5 xl:grid-cols-3">
          {analysis.sections.map((section) => (
            <SectionCard
              key={section.module}
              section={section}
              strongest={analysis.strongestSection === section.module}
              weakest={analysis.weakestSection === section.module}
            />
          ))}
        </div>
      </section>

      <section aria-labelledby="next-step" className="rounded-xl border border-primary bg-primary-muted p-6 sm:flex sm:items-center sm:justify-between sm:gap-6">
        <div>
          <p className="text-sm font-semibold text-primary" id="next-step">Your next step</p>
          <h2 className="mt-2 text-xl font-semibold">{recommended ? `Practise ${recommended.skill}` : "Review the questions you missed"}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{recommended?.reason ?? "Open the question review and revisit incorrect or unanswered questions with their explanations."}</p>
        </div>
        <Button asChild className="mt-5 w-full shrink-0 sm:mt-0 sm:w-auto"><Link href={(recommended?.href ?? "#question-review") as Route}>{recommended ? `Start ${recommended.questionCount} questions` : "Review mistakes"}</Link></Button>
      </section>

      <section aria-labelledby="key-insights" className="space-y-4">
        <SectionHeading id="key-insights" title="What this result suggests" description="Patterns from this completed mock." />
        <Card>
          <CardContent className="p-6">
            {analysis.insights.length ? (
              <ul className="grid gap-3" role="list">
                {analysis.insights.map((insight) => <li className="flex gap-3 text-sm leading-6" key={insight}><Target className="mt-1 h-4 w-4 shrink-0 text-primary" />{insight}</li>)}
              </ul>
            ) : <p className="text-sm text-slate-600">No repeated pattern stands out from this mock yet.</p>}
            {analysis.longitudinalContext.length ? (
              <div className="mt-5 border-t border-workspace-border pt-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Recent context</p>
                {analysis.longitudinalContext.map((item) => <p className="mt-2 text-sm" key={item}>{item}</p>)}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </section>

      <section aria-labelledby="marks-lost" className="space-y-4">
        <SectionHeading id="marks-lost" title="Where marks were lost" description="Repeated patterns are shown here; one isolated mistake is not labelled as a weak area." />
        {analysis.skillLosses.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {analysis.skillLosses.map((loss) => (
              <Card key={loss.skillId}>
                <CardContent className="p-5">
                  <p className="font-semibold">{loss.label}</p>
                  <p className="mt-2 text-sm text-slate-600">{loss.incorrectQuestions} incorrect questions</p>
                  <p className="mt-2 text-xs text-slate-500">Seen across easy, medium, or hard questions in this mock.</p>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : <Card><CardContent className="p-6 text-sm text-slate-600">No repeated skill pattern stands out. An isolated error is not labelled as a weak area.</CardContent></Card>}
      </section>

      <section aria-labelledby="timing-pacing" className="space-y-4">
        <SectionHeading id="timing-pacing" title="Timing and pacing" description="Timing is interpreted together with correctness; faster is not assumed to be better." />
        <div className="rounded-md border border-warning bg-warning-container p-4 text-sm leading-6 text-warning-container-foreground" role="note">
          Question durations are saved interaction time only. An unsaved final interval at an automatic boundary may be absent, and exact historical section time remaining is not persisted.
        </div>
        {analysis.timingAvailable ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Metric label="Fast + correct" value={timingCounts.fast_correct} />
            <Metric label="Fast + incorrect" value={timingCounts.fast_incorrect} />
            <Metric label="Slow + correct" value={timingCounts.slow_correct} />
            <Metric label="Slow + incorrect" value={timingCounts.slow_incorrect} />
          </div>
        ) : <Card><CardContent className="p-6 text-sm text-slate-600">There is not enough reliable saved question timing to classify pace for this mock.</CardContent></Card>}
        <div className="grid gap-4 md:grid-cols-3">
          {analysis.sections.map((section) => (
            <Card key={section.module}>
              <CardContent className="p-5 text-sm">
                <p className="font-semibold">{section.label}</p>
                <p className="mt-2 text-slate-600">{section.timingSampleCount} answered questions with saved time</p>
                <p className="mt-1 text-slate-600">Median: {section.medianResponseTimeSeconds === null ? "unavailable" : `${section.medianResponseTimeSeconds.toFixed(1)}s`}</p>
                <p className="mt-1 text-slate-600">Recorded total: {formatStudyTime(section.recordedQuestionTimeSeconds)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section aria-labelledby="question-review" className="space-y-4" id="question-review-section">
        <SectionHeading id="question-review" title="Question review" description="Review your answers and explanations from this completed mock." />
        <ResultReview analysis={analysis.questionAnalysis} attemptId={analysis.attemptId} questions={result.questions} />
      </section>
    </div>
  );
}

function SectionCard({ section, strongest, weakest }: { section: MockSectionAnalysis; strongest: boolean; weakest: boolean }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap gap-2">{strongest ? <Badge variant="success">Strongest</Badge> : null}{weakest ? <Badge variant="warning">Needs most work</Badge> : null}</div>
        <CardTitle>{section.label}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div><p className="text-3xl font-semibold">{section.correct} / {section.total}</p><p className="mt-1 text-sm text-slate-600">{percent(section.scoreAccuracy)} section accuracy · {section.incorrect} incorrect · {section.unanswered} unanswered</p></div>
        <div className="space-y-2 border-t border-workspace-border pt-4">
          {(["easy", "medium", "hard"] as const).map((difficulty) => {
            const row = section.difficulty[difficulty];
            return <div className="flex items-center justify-between gap-3 text-sm" key={difficulty}><span className="capitalize">{difficulty}</span><span className="font-medium">{row.correct} / {row.attempted} · {percent(row.accuracy)}</span></div>;
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function SectionHeading({ id, title, description }: { id: string; title: string; description: string }) {
  return <div><h2 className="text-2xl font-semibold text-slate-950" id={id}>{title}</h2><p className="mt-1 text-sm leading-6 text-slate-600">{description}</p></div>;
}

function Metric({ label, value, dark = false, icon }: { label: string; value: string | number; dark?: boolean; icon?: "incorrect" | "unanswered" | "time" }) {
  const Icon = icon === "incorrect" ? XCircle : icon === "unanswered" ? AlertTriangle : icon === "time" ? Clock3 : CheckCircle2;
  return <div className={dark ? "rounded-md border border-primary-foreground/20 bg-primary-muted p-4" : "rounded-md border border-workspace-border bg-surface-lowest p-4"}>{icon ? <Icon aria-hidden="true" className="h-5 w-5 opacity-80" /> : null}<p className="mt-2 text-2xl font-semibold">{value}</p><p className="mt-1 text-xs opacity-80">{label}</p></div>;
}
