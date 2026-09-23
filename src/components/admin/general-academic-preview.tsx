import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormulaCard } from "@/components/general-academic/math-expression";
import { GENERAL_ACADEMIC_DOMAIN_LABELS, GENERAL_ACADEMIC_SKILL_LABELS } from "@/lib/general-academic/registries";
import type { CanonicalGeneralAcademicPack } from "@/lib/general-academic/schemas";
import type { GeneralAcademicQualityResult } from "@/lib/general-academic/quality";

export function GeneralAcademicPreview({ pack, quality }: { pack: CanonicalGeneralAcademicPack; quality?: GeneralAcademicQualityResult }) {
  return (
    <section aria-label="General Academic admin preview" className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge>Admin preview</Badge>
        <Badge variant="subtle">{GENERAL_ACADEMIC_DOMAIN_LABELS[pack.domain]}</Badge>
        <Badge variant="subtle">{pack.difficulty}</Badge>
        <Badge variant="subtle">Draft only</Badge>
      </div>

      <Card>
        <CardHeader><CardTitle>{pack.title || "Untitled source pack"}</CardTitle></CardHeader>
        <CardContent className="space-y-5">
          <p className="whitespace-pre-wrap text-sm leading-7 text-on-surface-variant">{pack.stimulus.text || "No stimulus text yet."}</p>

          {pack.stimulus.formulas.map((formula) => <FormulaCard formula={formula} key={formula.id} technical />)}

          {pack.stimulus.tables.map((table) => (
            <div className="overflow-x-auto" key={table.id}>
              <p className="mb-2 text-sm font-semibold">{table.title || table.id}</p>
              <table className="min-w-full border-collapse text-left text-sm">
                <thead><tr>{table.columns.map((column, index) => <th className="border border-workspace-border bg-surface-container px-3 py-2" key={`${table.id}-column-${index}`}>{column}</th>)}</tr></thead>
                <tbody>{table.rows.map((row, rowIndex) => <tr key={`${table.id}-row-${rowIndex}`}>{row.map((cell, cellIndex) => <td className="border border-workspace-border px-3 py-2" key={`${table.id}-${rowIndex}-${cellIndex}`}>{String(cell ?? "")}</td>)}</tr>)}</tbody>
              </table>
            </div>
          ))}

          {pack.stimulus.graphs.map((graph) => (
            <div className="rounded-md border border-workspace-border p-4" key={graph.id}>
              <p className="font-semibold">{graph.title || graph.id} · {graph.type}</p>
              <p className="mt-1 text-xs text-muted-foreground">{graph.xAxis.label}{graph.xAxis.unit ? ` (${graph.xAxis.unit})` : ""} → {graph.yAxis.label}{graph.yAxis.unit ? ` (${graph.yAxis.unit})` : ""}</p>
              <div className="mt-3 space-y-2">{graph.series.map((series, index) => <p className="font-mono text-xs" key={`${graph.id}-series-${index}`}><span className="font-semibold">{series.name}:</span> {series.points.map((point) => `(${point.x}, ${point.y})`).join(", ")}</p>)}</div>
            </div>
          ))}

          {pack.stimulus.figures.map((figure) => (
            <div className="rounded-md border border-workspace-border p-4" key={figure.id}>
              <p className="font-semibold">{figure.title || figure.id} · diagram</p>
              <p className="mt-2 text-sm">{figure.description}</p>
              <pre className="mt-3 max-h-56 overflow-auto rounded bg-surface-container p-3 text-xs">{JSON.stringify(figure.data, null, 2)}</pre>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="space-y-4">
        {pack.questions.map((question) => (
          <Card key={question.id}>
            <CardHeader>
              <div className="flex flex-wrap items-center gap-2"><CardTitle>Question {question.order}</CardTitle><Badge variant="subtle">{GENERAL_ACADEMIC_SKILL_LABELS[question.skill]}</Badge><Badge variant="subtle">{question.difficulty}</Badge></div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="whitespace-pre-wrap text-sm leading-6">{question.prompt}</p>
              <ol className="grid gap-2 sm:grid-cols-2">{question.options.map((option) => <li className="rounded-md border border-workspace-border p-3 text-sm" key={option.id}><span className="font-semibold">{option.id}.</span> {option.text}</li>)}</ol>
              <div className="rounded-md border border-success/30 bg-success-container p-3 text-sm"><span className="font-semibold">Admin answer:</span> {question.correctOption}</div>
              {quality ? <div className="rounded-md bg-surface-container p-3 text-sm"><span className="font-semibold">Deterministic verification:</span> {quality.metrics.answerVerification.find((item) => item.questionId === question.id)?.message || "Manual verification required."}<details className="mt-2"><summary className="cursor-pointer text-xs font-semibold">Validation metadata</summary><pre className="mt-2 overflow-x-auto text-xs">{JSON.stringify(question.validation ?? { answerType: "manual" }, null, 2)}</pre></details></div> : null}
              <div className="space-y-2 text-sm"><p className="font-semibold">Explanation</p><p>{question.explanation.summary}</p><ol className="list-decimal space-y-1 pl-5">{question.explanation.steps.map((step, index) => <li key={`${question.id}-step-${index}`}>{step}</li>)}</ol><p><span className="font-semibold">Takeaway:</span> {question.explanation.takeaway}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
