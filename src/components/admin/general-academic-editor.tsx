"use client";

import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clipboard,
  Download,
  Eye,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { startTransition, useMemo, useState } from "react";

import { saveGeneralAcademicDraftAction, type GeneralAcademicSaveResult } from "@/app/admin/general-academic/actions";
import { FormulaCard } from "@/components/general-academic/math-expression";
import { GeneralAcademicPreview } from "@/components/admin/general-academic-preview";
import { GeneralAcademicQualitySummary } from "@/components/admin/general-academic-quality-summary";
import { GeneralAcademicValidationPanel } from "@/components/admin/general-academic-validation-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  createGeneralAcademicQuestion,
  moveGeneralAcademicQuestion,
  resequenceGeneralAcademicQuestions,
  validationMetadataForType,
} from "@/lib/general-academic/authoring";
import { exportGeneralAcademicPackJson } from "@/lib/general-academic/export";
import { buildGeneralAcademicExternalPrompt } from "@/lib/general-academic/external-prompt";
import { evaluateGeneralAcademicPackQuality } from "@/lib/general-academic/quality";
import {
  GENERAL_ACADEMIC_ANSWER_TYPES,
  GENERAL_ACADEMIC_DIFFICULTIES,
  GENERAL_ACADEMIC_DOMAINS,
  GENERAL_ACADEMIC_DOMAIN_LABELS,
  GENERAL_ACADEMIC_GRAPH_TYPES,
  GENERAL_ACADEMIC_OPTION_IDS,
  GENERAL_ACADEMIC_ORIGINS,
  GENERAL_ACADEMIC_SKILLS,
  GENERAL_ACADEMIC_SKILL_LABELS,
} from "@/lib/general-academic/registries";
import type { CanonicalGeneralAcademicPack, GeneralAcademicQuestion } from "@/lib/general-academic/schemas";
import type { GeneralAcademicValidationFinding } from "@/lib/general-academic/validation";
import { validateGeneralAcademicPack } from "@/lib/general-academic/validation";

const inputClass = "h-10 w-full min-w-0 rounded-md border border-workspace-border bg-surface-lowest px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";
const textareaClass = "w-full min-w-0 rounded-md border border-workspace-border bg-surface-lowest p-3 text-sm leading-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";
const labelClass = "grid min-w-0 gap-1.5 text-sm font-semibold";

type EditorMode = "manual" | "import" | "generated" | "edit";
type Formula = CanonicalGeneralAcademicPack["stimulus"]["formulas"][number];
type Table = CanonicalGeneralAcademicPack["stimulus"]["tables"][number];
type Graph = CanonicalGeneralAcademicPack["stimulus"]["graphs"][number];
type Figure = CanonicalGeneralAcademicPack["stimulus"]["figures"][number];

function nextId(prefix: string, ids: string[]) {
  let index = ids.length + 1;
  while (ids.includes(`${prefix}_${index}`)) index += 1;
  return `${prefix}_${index}`;
}

function FigureDataEditor({ figure, onChange }: { figure: Figure; onChange: (data: Figure["data"]) => void }) {
  const [value, setValue] = useState(() => JSON.stringify(figure.data, null, 2));
  const [error, setError] = useState<string | null>(null);
  function update(nextValue: string) {
    setValue(nextValue);
    try {
      onChange(JSON.parse(nextValue));
      setError(null);
    } catch {
      setError("Figure data must be valid JSON before validation or saving.");
      // Preserve the invalid editor state in the canonical object as a value
      // the Phase 1 structured-data safety validator must reject. This avoids
      // silently saving the previously valid figure data.
      onChange({ onclick: "invalid_figure_json" });
    }
  }
  return <label className={labelClass}>Structured figure data<textarea aria-invalid={Boolean(error)} className={`${textareaClass} min-h-32 font-mono text-xs`} onChange={(event) => update(event.target.value)} value={value} />{error ? <span className="text-xs text-error" role="alert">{error}</span> : <span className="text-xs font-normal text-muted-foreground">JSON-serializable data only. HTML and scriptable content are rejected.</span>}</label>;
}

export function GeneralAcademicEditor({
  initialPack,
  mode,
  packId,
  importWarnings = [],
}: {
  initialPack: CanonicalGeneralAcademicPack;
  mode: EditorMode;
  packId?: string;
  importWarnings?: GeneralAcademicValidationFinding[];
}) {
  const router = useRouter();
  const [pack, setPack] = useState(initialPack);
  const [errors, setErrors] = useState<GeneralAcademicValidationFinding[]>([]);
  const [hasValidated, setHasValidated] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saveResult, setSaveResult] = useState<GeneralAcademicSaveResult | null>(null);
  const [promptStatus, setPromptStatus] = useState<string | null>(null);
  const [representations, setRepresentations] = useState<Array<"text" | "formula" | "table" | "graph" | "figure">>(["text"]);

  const questionSkills = useMemo(() => [...new Set(pack.questions.map((question) => question.skill))], [pack.questions]);
  const quality = useMemo(() => evaluateGeneralAcademicPackQuality(pack), [pack]);

  function change(updater: (current: CanonicalGeneralAcademicPack) => CanonicalGeneralAcademicPack) {
    setPack((current) => updater(current));
    setDirty(true);
    setHasValidated(false);
    setSaveResult(null);
  }

  function runValidation() {
    const result = validateGeneralAcademicPack(pack);
    setHasValidated(true);
    setErrors(result.valid ? [] : result.errors);
    return result.valid;
  }

  function saveDraft() {
    if (!runValidation()) return;
    setSaving(true);
    startTransition(async () => {
      const result = await saveGeneralAcademicDraftAction(pack, packId);
      setSaveResult(result);
      setSaving(false);
      if (!result.ok) {
        setErrors(result.errors);
        setHasValidated(true);
        return;
      }
      setDirty(false);
      if (!packId) router.replace(`/admin/general-academic/${result.id}/edit` as Route);
      else router.refresh();
    });
  }

  function exportJson() {
    if (!runValidation()) return;
    const blob = new Blob([exportGeneralAcademicPackJson(pack)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${pack.title.toLocaleLowerCase("en").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "general-academic-pack"}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function copyPrompt() {
    try {
      const prompt = buildGeneralAcademicExternalPrompt({
        domain: pack.domain,
        topic: pack.topic,
        packDifficulty: pack.difficulty,
        questionCount: Math.max(1, pack.questions.length),
        skills: questionSkills,
        representations,
      });
      await navigator.clipboard.writeText(prompt);
      setPromptStatus("Provider-neutral prompt copied.");
    } catch {
      setPromptStatus("Unable to copy. Check clipboard permission and try again.");
    }
  }

  const updateFormula = (index: number, updater: (formula: Formula) => Formula) => change((current) => ({ ...current, stimulus: { ...current.stimulus, formulas: current.stimulus.formulas.map((formula, itemIndex) => itemIndex === index ? updater(formula) : formula) } }));
  const updateTable = (index: number, updater: (table: Table) => Table) => change((current) => ({ ...current, stimulus: { ...current.stimulus, tables: current.stimulus.tables.map((table, itemIndex) => itemIndex === index ? updater(table) : table) } }));
  const updateGraph = (index: number, updater: (graph: Graph) => Graph) => change((current) => ({ ...current, stimulus: { ...current.stimulus, graphs: current.stimulus.graphs.map((graph, itemIndex) => itemIndex === index ? updater(graph) : graph) } }));
  const updateFigure = (index: number, updater: (figure: Figure) => Figure) => change((current) => ({ ...current, stimulus: { ...current.stimulus, figures: current.stimulus.figures.map((figure, itemIndex) => itemIndex === index ? updater(figure) : figure) } }));
  const updateQuestion = (index: number, updater: (question: GeneralAcademicQuestion) => GeneralAcademicQuestion) => change((current) => ({ ...current, questions: current.questions.map((question, itemIndex) => itemIndex === index ? updater(question) : question) }));

  return (
    <div className="space-y-6">
      <div className="sticky top-[82px] z-20 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-workspace-border bg-surface-lowest/95 p-3 shadow-sm backdrop-blur">
        <div className="flex flex-wrap items-center gap-2"><Badge>Draft only</Badge>{dirty ? <Badge variant="warning">Unsaved changes</Badge> : <Badge variant="success">Saved state</Badge>}{mode === "import" ? <Badge variant="subtle">Imported content</Badge> : null}{mode === "generated" ? <Badge variant="subtle">AI-generated content</Badge> : null}</div>
        <div className="flex flex-wrap gap-2"><Button onClick={runValidation} type="button" variant="outline"><CheckCircle2 className="size-4" /> Validate pack</Button><Button onClick={() => setShowPreview((value) => !value)} type="button" variant="outline"><Eye className="size-4" /> {showPreview ? "Hide preview" : "Preview"}</Button><Button onClick={exportJson} type="button" variant="outline"><Download className="size-4" /> Export JSON</Button><Button disabled={saving} onClick={saveDraft} type="button"><Save className="size-4" /> {saving ? "Saving…" : "Save draft"}</Button></div>
      </div>

      {saveResult ? <div aria-live="polite" className={`rounded-md border p-4 text-sm ${saveResult.ok ? "border-success/40 bg-success-container" : "border-error/40 bg-error-container"}`}><p className="font-semibold">{saveResult.message}</p>{saveResult.ok && saveResult.duplicateTitles.length ? <p className="mt-1">Matching draft: {saveResult.duplicateTitles.join(", ")}. Nothing was overwritten.</p> : null}</div> : null}

      <Card>
        <CardHeader><CardTitle>Pack metadata</CardTitle><CardDescription>Stable registries drive classification. Security state is not editable.</CardDescription></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <label className={`${labelClass} md:col-span-2`}>Title<input className={inputClass} maxLength={200} onChange={(event) => change((current) => ({ ...current, title: event.target.value }))} value={pack.title} /></label>
          <label className={labelClass}>Domain<select className={inputClass} onChange={(event) => change((current) => ({ ...current, domain: event.target.value as CanonicalGeneralAcademicPack["domain"] }))} value={pack.domain}>{GENERAL_ACADEMIC_DOMAINS.map((value) => <option key={value} value={value}>{GENERAL_ACADEMIC_DOMAIN_LABELS[value]}</option>)}</select></label>
          <label className={`${labelClass} md:col-span-2`}>Topic<input className={inputClass} maxLength={200} onChange={(event) => change((current) => ({ ...current, topic: event.target.value }))} value={pack.topic} /></label>
          <label className={labelClass}>Pack difficulty<select className={inputClass} onChange={(event) => change((current) => ({ ...current, difficulty: event.target.value as CanonicalGeneralAcademicPack["difficulty"] }))} value={pack.difficulty}>{GENERAL_ACADEMIC_DIFFICULTIES.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
          <label className={labelClass}>Origin<select className={inputClass} disabled={mode === "manual"} onChange={(event) => change((current) => ({ ...current, origin: event.target.value as CanonicalGeneralAcademicPack["origin"] }))} value={pack.origin}>{GENERAL_ACADEMIC_ORIGINS.map((value) => <option key={value} value={value}>{value.replace(/_/g, " ")}</option>)}</select>{mode === "manual" ? <span className="text-xs font-normal text-muted-foreground">Manual creation always uses manual provenance.</span> : null}</label>
          <label className={`${labelClass} md:col-span-2`}>Tags<input className={inputClass} onChange={(event) => change((current) => ({ ...current, tags: event.target.value.split(",").map((tag) => tag.trim().toLocaleLowerCase("en")).filter(Boolean) }))} placeholder="energy, engineering" value={pack.tags.join(", ")} /></label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Academic stimulus</CardTitle><CardDescription>Plain text only. Imported HTML, SVG, scripts, and event handlers are rejected.</CardDescription></CardHeader>
        <CardContent><label className={labelClass}>Source text<textarea className={`${textareaClass} min-h-64`} maxLength={100000} onChange={(event) => change((current) => ({ ...current, stimulus: { ...current.stimulus, text: event.target.value } }))} value={pack.stimulus.text} /><span className="text-right text-xs font-normal text-muted-foreground">{pack.stimulus.text.length.toLocaleString("en")} / 100,000</span></label></CardContent>
      </Card>

      <FormulaEditor formulas={pack.stimulus.formulas} onAdd={() => change((current) => ({ ...current, stimulus: { ...current.stimulus, formulas: [...current.stimulus.formulas, { id: nextId("formula", current.stimulus.formulas.map((item) => item.id)), label: null, expression: "", variables: [] }] } }))} onRemove={(index) => change((current) => ({ ...current, stimulus: { ...current.stimulus, formulas: current.stimulus.formulas.filter((_, itemIndex) => itemIndex !== index) } }))} onUpdate={updateFormula} />
      <TableEditor tables={pack.stimulus.tables} onAdd={() => change((current) => ({ ...current, stimulus: { ...current.stimulus, tables: [...current.stimulus.tables, { id: nextId("table", current.stimulus.tables.map((item) => item.id)), title: null, columns: ["Column 1"], rows: [[""]] }] } }))} onRemove={(index) => change((current) => ({ ...current, stimulus: { ...current.stimulus, tables: current.stimulus.tables.filter((_, itemIndex) => itemIndex !== index) } }))} onUpdate={updateTable} />
      <GraphEditor graphs={pack.stimulus.graphs} onAdd={() => change((current) => ({ ...current, stimulus: { ...current.stimulus, graphs: [...current.stimulus.graphs, { id: nextId("graph", current.stimulus.graphs.map((item) => item.id)), type: "line", title: null, xAxis: { label: "X", unit: null }, yAxis: { label: "Y", unit: null }, series: [{ name: "Series 1", points: [{ x: 0, y: 0 }] }] }] } }))} onRemove={(index) => change((current) => ({ ...current, stimulus: { ...current.stimulus, graphs: current.stimulus.graphs.filter((_, itemIndex) => itemIndex !== index) } }))} onUpdate={updateGraph} />
      <FigureEditor figures={pack.stimulus.figures} onAdd={() => change((current) => ({ ...current, stimulus: { ...current.stimulus, figures: [...current.stimulus.figures, { id: nextId("figure", current.stimulus.figures.map((item) => item.id)), type: "diagram", title: null, description: "", data: {} }] } }))} onRemove={(index) => change((current) => ({ ...current, stimulus: { ...current.stimulus, figures: current.stimulus.figures.filter((_, itemIndex) => itemIndex !== index) } }))} onUpdate={updateFigure} />

      <QuestionEditor questions={pack.questions} onAdd={() => change((current) => ({ ...current, questions: [...current.questions, createGeneralAcademicQuestion(current.questions.length + 1)] }))} onMove={(index, direction) => change((current) => ({ ...current, questions: moveGeneralAcademicQuestion(current.questions, index, direction) }))} onRemove={(index) => change((current) => ({ ...current, questions: resequenceGeneralAcademicQuestions(current.questions.filter((_, itemIndex) => itemIndex !== index)) }))} onUpdate={updateQuestion} />

      <Card>
        <CardHeader><CardTitle>External-AI prompt helper</CardTitle><CardDescription>Creates local provider-neutral text only. It does not call an AI service.</CardDescription></CardHeader>
        <CardContent className="space-y-4"><fieldset><legend className="text-sm font-semibold">Representation preferences</legend><div className="mt-2 flex flex-wrap gap-4">{(["text", "formula", "table", "graph", "figure"] as const).map((value) => <label className="flex items-center gap-2 text-sm" key={value}><input checked={representations.includes(value)} onChange={(event) => setRepresentations((current) => event.target.checked ? [...new Set([...current, value])] : current.filter((item) => item !== value))} type="checkbox" />{value}</label>)}</div></fieldset><div className="flex flex-wrap items-center gap-3"><Button onClick={copyPrompt} type="button" variant="secondary"><Clipboard className="size-4" /> Copy JSON generation prompt</Button><span aria-live="polite" className="text-sm text-muted-foreground">{promptStatus}</span></div><p className="text-xs text-muted-foreground">Uses the selected domain, topic, pack difficulty, {pack.questions.length} linked question{pack.questions.length === 1 ? "" : "s"}, and the skills currently assigned in this editor.</p></CardContent>
      </Card>

      {hasValidated || importWarnings.length ? <GeneralAcademicValidationPanel errors={errors} pack={pack} warnings={importWarnings} /> : null}
      {hasValidated ? <GeneralAcademicQualitySummary quality={quality} /> : null}
      {showPreview ? <GeneralAcademicPreview pack={pack} quality={quality} /> : null}
    </div>
  );
}

function SectionHeading({ title, description, action }: { title: string; description: string; action: React.ReactNode }) {
  return <CardHeader className="flex-row items-start justify-between gap-4"><div><CardTitle>{title}</CardTitle><CardDescription className="mt-2">{description}</CardDescription></div>{action}</CardHeader>;
}

function FormulaEditor({ formulas, onAdd, onRemove, onUpdate }: { formulas: Formula[]; onAdd: () => void; onRemove: (index: number) => void; onUpdate: (index: number, updater: (formula: Formula) => Formula) => void }) {
  return <Card><SectionHeading title="Formulas" description="Keep the machine expression authoritative. Optional LaTeX controls professional presentation." action={<Button onClick={onAdd} size="sm" type="button" variant="outline"><Plus className="size-4" /> Add formula</Button>} /><CardContent className="space-y-4">{formulas.length ? formulas.map((formula, formulaIndex) => <fieldset className="min-w-0 rounded-md border border-workspace-border p-4" key={`${formula.id}-${formulaIndex}`}><legend className="px-2 text-sm font-semibold">Formula {formulaIndex + 1}</legend><div className="grid gap-4 md:grid-cols-3"><label className={labelClass}>ID<input className={inputClass} onChange={(event) => onUpdate(formulaIndex, (item) => ({ ...item, id: event.target.value }))} value={formula.id} /></label><label className={labelClass}>Label<input className={inputClass} onChange={(event) => onUpdate(formulaIndex, (item) => ({ ...item, label: event.target.value || null }))} value={formula.label ?? ""} /></label><label className={`${labelClass} md:col-span-3`}>Machine expression<input className={`${inputClass} font-mono`} onChange={(event) => onUpdate(formulaIndex, (item) => ({ ...item, expression: event.target.value }))} value={formula.expression} /></label><label className={`${labelClass} md:col-span-3`}>Display math / LaTeX (optional)<input className={`${inputClass} font-mono`} onChange={(event) => onUpdate(formulaIndex, (item) => ({ ...item, display: event.target.value ? { latex: event.target.value } : undefined }))} placeholder="Q_{\\mathrm{rec}} = \\varepsilon \\dot{m} c_p \\Delta T" value={formula.display?.latex ?? ""} /></label></div><div className="mt-4"><p className="mb-2 text-sm font-semibold">Live preview</p><FormulaCard formula={formula} /></div><div className="mt-4 space-y-3"><div className="flex items-center justify-between"><p className="text-sm font-semibold">Variables</p><Button onClick={() => onUpdate(formulaIndex, (item) => ({ ...item, variables: [...item.variables, { symbol: "", displaySymbol: null, meaning: "", unit: null }] }))} size="sm" type="button" variant="ghost"><Plus className="size-4" /> Add variable</Button></div>{formula.variables.map((variable, variableIndex) => <div className="grid gap-3 rounded bg-surface-container p-3 md:grid-cols-[1fr_1fr_2fr_1fr_auto]" key={`${formula.id}-variable-${variableIndex}`}><label className={labelClass}>Machine symbol<input className={inputClass} onChange={(event) => onUpdate(formulaIndex, (item) => ({ ...item, variables: item.variables.map((entry, index) => index === variableIndex ? { ...entry, symbol: event.target.value } : entry) }))} value={variable.symbol} /></label><label className={labelClass}>Display symbol<input className={`${inputClass} font-mono`} onChange={(event) => onUpdate(formulaIndex, (item) => ({ ...item, variables: item.variables.map((entry, index) => index === variableIndex ? { ...entry, displaySymbol: event.target.value || null } : entry) }))} value={variable.displaySymbol ?? ""} /></label><label className={labelClass}>Meaning<input className={inputClass} onChange={(event) => onUpdate(formulaIndex, (item) => ({ ...item, variables: item.variables.map((entry, index) => index === variableIndex ? { ...entry, meaning: event.target.value } : entry) }))} value={variable.meaning} /></label><label className={labelClass}>Unit<input className={inputClass} onChange={(event) => onUpdate(formulaIndex, (item) => ({ ...item, variables: item.variables.map((entry, index) => index === variableIndex ? { ...entry, unit: event.target.value || null } : entry) }))} value={variable.unit ?? ""} /></label><Button aria-label={`Remove variable ${variableIndex + 1}`} className="self-end" onClick={() => onUpdate(formulaIndex, (item) => ({ ...item, variables: item.variables.filter((_, index) => index !== variableIndex) }))} size="sm" type="button" variant="ghost"><Trash2 className="size-4" /></Button></div>)}</div><Button className="mt-4" onClick={() => onRemove(formulaIndex)} size="sm" type="button" variant="destructive"><Trash2 className="size-4" /> Remove formula</Button></fieldset>) : <p className="text-sm text-muted-foreground">No formulas. Add one only when the source uses a formula.</p>}</CardContent></Card>;
}

function TableEditor({ tables, onAdd, onRemove, onUpdate }: { tables: Table[]; onAdd: () => void; onRemove: (index: number) => void; onUpdate: (index: number, updater: (table: Table) => Table) => void }) {
  return <Card><SectionHeading title="Tables" description="Simple structured tables. Adding or removing columns keeps every row the same width." action={<Button onClick={onAdd} size="sm" type="button" variant="outline"><Plus className="size-4" /> Add table</Button>} /><CardContent className="space-y-4">{tables.length ? tables.map((table, tableIndex) => <fieldset className="min-w-0 rounded-md border border-workspace-border p-4" key={`${table.id}-${tableIndex}`}><legend className="px-2 text-sm font-semibold">Table {tableIndex + 1}</legend><div className="grid gap-4 md:grid-cols-2"><label className={labelClass}>ID<input className={inputClass} onChange={(event) => onUpdate(tableIndex, (item) => ({ ...item, id: event.target.value }))} value={table.id} /></label><label className={labelClass}>Title<input className={inputClass} onChange={(event) => onUpdate(tableIndex, (item) => ({ ...item, title: event.target.value || null }))} value={table.title ?? ""} /></label></div><div className="mt-4 overflow-x-auto"><table className="min-w-[620px] border-collapse"><thead><tr>{table.columns.map((column, columnIndex) => <th className="border border-workspace-border p-2 align-top" key={`${table.id}-column-${columnIndex}`}><label className="sr-only">Column {columnIndex + 1}</label><div className="flex gap-1"><input aria-label={`Column ${columnIndex + 1}`} className={inputClass} onChange={(event) => onUpdate(tableIndex, (item) => ({ ...item, columns: item.columns.map((entry, index) => index === columnIndex ? event.target.value : entry) }))} value={column} /><Button aria-label={`Remove column ${columnIndex + 1}`} disabled={table.columns.length <= 1} onClick={() => onUpdate(tableIndex, (item) => ({ ...item, columns: item.columns.filter((_, index) => index !== columnIndex), rows: item.rows.map((row) => row.filter((_, index) => index !== columnIndex)) }))} size="sm" type="button" variant="ghost"><Trash2 className="size-4" /></Button></div></th>)}<th className="border border-workspace-border p-2"><Button onClick={() => onUpdate(tableIndex, (item) => ({ ...item, columns: [...item.columns, `Column ${item.columns.length + 1}`], rows: item.rows.map((row) => [...row, ""]) }))} size="sm" type="button" variant="outline"><Plus className="size-4" /> Column</Button></th></tr></thead><tbody>{table.rows.map((row, rowIndex) => <tr key={`${table.id}-row-${rowIndex}`}>{row.map((cell, cellIndex) => <td className="border border-workspace-border p-2" key={`${table.id}-${rowIndex}-${cellIndex}`}><input aria-label={`Table ${tableIndex + 1} row ${rowIndex + 1} cell ${cellIndex + 1}`} className={inputClass} onChange={(event) => onUpdate(tableIndex, (item) => ({ ...item, rows: item.rows.map((entry, index) => index === rowIndex ? entry.map((value, valueIndex) => valueIndex === cellIndex ? event.target.value : value) : entry) }))} value={String(cell ?? "")} /></td>)}<td className="border border-workspace-border p-2"><Button aria-label={`Remove row ${rowIndex + 1}`} onClick={() => onUpdate(tableIndex, (item) => ({ ...item, rows: item.rows.filter((_, index) => index !== rowIndex) }))} size="sm" type="button" variant="ghost"><Trash2 className="size-4" /></Button></td></tr>)}</tbody></table></div><div className="mt-3 flex flex-wrap gap-2"><Button onClick={() => onUpdate(tableIndex, (item) => ({ ...item, rows: [...item.rows, item.columns.map(() => "")] }))} size="sm" type="button" variant="outline"><Plus className="size-4" /> Add row</Button><Button onClick={() => onRemove(tableIndex)} size="sm" type="button" variant="destructive"><Trash2 className="size-4" /> Remove table</Button></div></fieldset>) : <p className="text-sm text-muted-foreground">No structured tables.</p>}</CardContent></Card>;
}

function GraphEditor({ graphs, onAdd, onRemove, onUpdate }: { graphs: Graph[]; onAdd: () => void; onRemove: (index: number) => void; onUpdate: (index: number, updater: (graph: Graph) => Graph) => void }) {
  return <Card><SectionHeading title="Graphs" description="Data-driven line, bar, and scatter representations. No chart styling is stored." action={<Button onClick={onAdd} size="sm" type="button" variant="outline"><Plus className="size-4" /> Add graph</Button>} /><CardContent className="space-y-4">{graphs.length ? graphs.map((graph, graphIndex) => <fieldset className="rounded-md border border-workspace-border p-4" key={`${graph.id}-${graphIndex}`}><legend className="px-2 text-sm font-semibold">Graph {graphIndex + 1}</legend><div className="grid gap-4 md:grid-cols-3"><label className={labelClass}>ID<input className={inputClass} onChange={(event) => onUpdate(graphIndex, (item) => ({ ...item, id: event.target.value }))} value={graph.id} /></label><label className={labelClass}>Type<select className={inputClass} onChange={(event) => onUpdate(graphIndex, (item) => ({ ...item, type: event.target.value as Graph["type"] }))} value={graph.type}>{GENERAL_ACADEMIC_GRAPH_TYPES.map((value) => <option key={value} value={value}>{value}</option>)}</select></label><label className={labelClass}>Title<input className={inputClass} onChange={(event) => onUpdate(graphIndex, (item) => ({ ...item, title: event.target.value || null }))} value={graph.title ?? ""} /></label>{(["xAxis", "yAxis"] as const).map((axis) => <div className="grid gap-3 rounded bg-surface-container p-3 md:col-span-3 md:grid-cols-2" key={axis}><label className={labelClass}>{axis === "xAxis" ? "X" : "Y"}-axis label<input className={inputClass} onChange={(event) => onUpdate(graphIndex, (item) => ({ ...item, [axis]: { ...item[axis], label: event.target.value } }))} value={graph[axis].label} /></label><label className={labelClass}>Unit<input className={inputClass} onChange={(event) => onUpdate(graphIndex, (item) => ({ ...item, [axis]: { ...item[axis], unit: event.target.value || null } }))} value={graph[axis].unit ?? ""} /></label></div>)}</div><div className="mt-4 space-y-4">{graph.series.map((series, seriesIndex) => <fieldset className="rounded bg-surface-container p-3" key={`${graph.id}-series-${seriesIndex}`}><legend className="px-2 text-sm font-semibold">Series {seriesIndex + 1}</legend><label className={labelClass}>Name<input className={inputClass} onChange={(event) => onUpdate(graphIndex, (item) => ({ ...item, series: item.series.map((entry, index) => index === seriesIndex ? { ...entry, name: event.target.value } : entry) }))} value={series.name} /></label><div className="mt-3 space-y-2">{series.points.map((point, pointIndex) => <div className="grid grid-cols-[1fr_1fr_auto] gap-2" key={`${graph.id}-${seriesIndex}-point-${pointIndex}`}><label className={labelClass}>X<input className={inputClass} onChange={(event) => onUpdate(graphIndex, (item) => ({ ...item, series: item.series.map((entry, index) => index === seriesIndex ? { ...entry, points: entry.points.map((value, valueIndex) => valueIndex === pointIndex ? { ...value, x: Number(event.target.value) } : value) } : entry) }))} type="number" value={point.x} /></label><label className={labelClass}>Y<input className={inputClass} onChange={(event) => onUpdate(graphIndex, (item) => ({ ...item, series: item.series.map((entry, index) => index === seriesIndex ? { ...entry, points: entry.points.map((value, valueIndex) => valueIndex === pointIndex ? { ...value, y: Number(event.target.value) } : value) } : entry) }))} type="number" value={point.y} /></label><Button aria-label={`Remove point ${pointIndex + 1}`} className="self-end" disabled={series.points.length <= 1} onClick={() => onUpdate(graphIndex, (item) => ({ ...item, series: item.series.map((entry, index) => index === seriesIndex ? { ...entry, points: entry.points.filter((_, valueIndex) => valueIndex !== pointIndex) } : entry) }))} size="sm" type="button" variant="ghost"><Trash2 className="size-4" /></Button></div>)}</div><div className="mt-3 flex gap-2"><Button onClick={() => onUpdate(graphIndex, (item) => ({ ...item, series: item.series.map((entry, index) => index === seriesIndex ? { ...entry, points: [...entry.points, { x: 0, y: 0 }] } : entry) }))} size="sm" type="button" variant="outline"><Plus className="size-4" /> Point</Button><Button disabled={graph.series.length <= 1} onClick={() => onUpdate(graphIndex, (item) => ({ ...item, series: item.series.filter((_, index) => index !== seriesIndex) }))} size="sm" type="button" variant="ghost"><Trash2 className="size-4" /> Series</Button></div></fieldset>)}</div><div className="mt-4 flex flex-wrap gap-2"><Button onClick={() => onUpdate(graphIndex, (item) => ({ ...item, series: [...item.series, { name: `Series ${item.series.length + 1}`, points: [{ x: 0, y: 0 }] }] }))} size="sm" type="button" variant="outline"><Plus className="size-4" /> Add series</Button><Button onClick={() => onRemove(graphIndex)} size="sm" type="button" variant="destructive"><Trash2 className="size-4" /> Remove graph</Button></div></fieldset>) : <p className="text-sm text-muted-foreground">No structured graphs.</p>}</CardContent></Card>;
}

function FigureEditor({ figures, onAdd, onRemove, onUpdate }: { figures: Figure[]; onAdd: () => void; onRemove: (index: number) => void; onUpdate: (index: number, updater: (figure: Figure) => Figure) => void }) {
  return <Card><SectionHeading title="Figures" description="Bounded diagram descriptors only; raw HTML and SVG are not accepted." action={<Button onClick={onAdd} size="sm" type="button" variant="outline"><Plus className="size-4" /> Add figure</Button>} /><CardContent className="space-y-4">{figures.length ? figures.map((figure, figureIndex) => <fieldset className="rounded-md border border-workspace-border p-4" key={`${figure.id}-${figureIndex}`}><legend className="px-2 text-sm font-semibold">Figure {figureIndex + 1}</legend><div className="grid gap-4 md:grid-cols-2"><label className={labelClass}>ID<input className={inputClass} onChange={(event) => onUpdate(figureIndex, (item) => ({ ...item, id: event.target.value }))} value={figure.id} /></label><label className={labelClass}>Title<input className={inputClass} onChange={(event) => onUpdate(figureIndex, (item) => ({ ...item, title: event.target.value || null }))} value={figure.title ?? ""} /></label><label className={`${labelClass} md:col-span-2`}>Description<textarea className={`${textareaClass} min-h-24`} onChange={(event) => onUpdate(figureIndex, (item) => ({ ...item, description: event.target.value }))} value={figure.description} /></label><div className="md:col-span-2"><FigureDataEditor figure={figure} onChange={(data) => onUpdate(figureIndex, (item) => ({ ...item, data }))} /></div></div><Button className="mt-4" onClick={() => onRemove(figureIndex)} size="sm" type="button" variant="destructive"><Trash2 className="size-4" /> Remove figure</Button></fieldset>) : <p className="text-sm text-muted-foreground">No diagram descriptors.</p>}</CardContent></Card>;
}

function QuestionEditor({ questions, onAdd, onMove, onRemove, onUpdate }: { questions: GeneralAcademicQuestion[]; onAdd: () => void; onMove: (index: number, direction: -1 | 1) => void; onRemove: (index: number) => void; onUpdate: (index: number, updater: (question: GeneralAcademicQuestion) => GeneralAcademicQuestion) => void }) {
  return <Card><SectionHeading title="Linked questions" description="Every question uses the shared source and always has exactly four answer options." action={<Button onClick={onAdd} size="sm" type="button"><Plus className="size-4" /> Add question</Button>} /><CardContent className="space-y-4">{questions.map((question, questionIndex) => <details className="rounded-md border border-workspace-border" key={`${question.id}-${questionIndex}`} open={questionIndex === 0}><summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">Question {question.order}: {question.prompt || "Untitled question"}<span className="text-xs font-normal text-muted-foreground">{GENERAL_ACADEMIC_SKILL_LABELS[question.skill]} · {question.difficulty}</span></summary><div className="space-y-5 border-t border-workspace-border p-4"><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"><label className={labelClass}>Question ID<input className={inputClass} onChange={(event) => onUpdate(questionIndex, (item) => ({ ...item, id: event.target.value }))} value={question.id} /></label><label className={labelClass}>Order<input className={inputClass} readOnly value={question.order} /></label><label className={labelClass}>Skill<select className={inputClass} onChange={(event) => onUpdate(questionIndex, (item) => ({ ...item, skill: event.target.value as GeneralAcademicQuestion["skill"] }))} value={question.skill}>{GENERAL_ACADEMIC_SKILLS.map((value) => <option key={value} value={value}>{GENERAL_ACADEMIC_SKILL_LABELS[value]}</option>)}</select></label><label className={labelClass}>Question difficulty<select className={inputClass} onChange={(event) => onUpdate(questionIndex, (item) => ({ ...item, difficulty: event.target.value as GeneralAcademicQuestion["difficulty"] }))} value={question.difficulty}>{GENERAL_ACADEMIC_DIFFICULTIES.map((value) => <option key={value} value={value}>{value}</option>)}</select></label></div><label className={labelClass}>Prompt<textarea className={`${textareaClass} min-h-28`} onChange={(event) => onUpdate(questionIndex, (item) => ({ ...item, prompt: event.target.value }))} value={question.prompt} /></label><fieldset><legend className="text-sm font-semibold">Answer options — fixed A/B/C/D</legend><div className="mt-2 grid gap-3 md:grid-cols-2">{question.options.map((option, optionIndex) => <label className={labelClass} key={option.id}>{option.id}<input className={inputClass} onChange={(event) => onUpdate(questionIndex, (item) => ({ ...item, options: item.options.map((entry, index) => index === optionIndex ? { ...entry, text: event.target.value } : entry) }))} value={option.text} /></label>)}</div></fieldset><label className={labelClass}>Correct option<select className={inputClass} onChange={(event) => onUpdate(questionIndex, (item) => ({ ...item, correctOption: event.target.value as GeneralAcademicQuestion["correctOption"] }))} value={question.correctOption}>{GENERAL_ACADEMIC_OPTION_IDS.map((value) => <option key={value} value={value}>{value}</option>)}</select></label><fieldset className="space-y-3 rounded bg-surface-container p-4"><legend className="px-2 text-sm font-semibold">Explanation</legend><label className={labelClass}>Summary<textarea className={`${textareaClass} min-h-20`} onChange={(event) => onUpdate(questionIndex, (item) => ({ ...item, explanation: { ...item.explanation, summary: event.target.value } }))} value={question.explanation.summary} /></label><div className="space-y-2"><p className="text-sm font-semibold">Steps</p>{question.explanation.steps.map((step, stepIndex) => <div className="grid grid-cols-[auto_1fr_auto_auto_auto] items-start gap-2" key={`${question.id}-step-${stepIndex}`}><span className="pt-2 text-sm">{stepIndex + 1}</span><textarea aria-label={`Explanation step ${stepIndex + 1}`} className={`${textareaClass} min-h-16`} onChange={(event) => onUpdate(questionIndex, (item) => ({ ...item, explanation: { ...item.explanation, steps: item.explanation.steps.map((entry, index) => index === stepIndex ? event.target.value : entry) } }))} value={step} /><Button aria-label={`Move explanation step ${stepIndex + 1} up`} disabled={stepIndex === 0} onClick={() => onUpdate(questionIndex, (item) => { const steps = [...item.explanation.steps]; [steps[stepIndex - 1], steps[stepIndex]] = [steps[stepIndex], steps[stepIndex - 1]]; return { ...item, explanation: { ...item.explanation, steps } }; })} size="sm" type="button" variant="ghost"><ChevronUp className="size-4" /></Button><Button aria-label={`Move explanation step ${stepIndex + 1} down`} disabled={stepIndex === question.explanation.steps.length - 1} onClick={() => onUpdate(questionIndex, (item) => { const steps = [...item.explanation.steps]; [steps[stepIndex], steps[stepIndex + 1]] = [steps[stepIndex + 1], steps[stepIndex]]; return { ...item, explanation: { ...item.explanation, steps } }; })} size="sm" type="button" variant="ghost"><ChevronDown className="size-4" /></Button><Button aria-label={`Remove explanation step ${stepIndex + 1}`} disabled={question.explanation.steps.length <= 1} onClick={() => onUpdate(questionIndex, (item) => ({ ...item, explanation: { ...item.explanation, steps: item.explanation.steps.filter((_, index) => index !== stepIndex) } }))} size="sm" type="button" variant="ghost"><Trash2 className="size-4" /></Button></div>)}<Button onClick={() => onUpdate(questionIndex, (item) => ({ ...item, explanation: { ...item.explanation, steps: [...item.explanation.steps, ""] } }))} size="sm" type="button" variant="outline"><Plus className="size-4" /> Add step</Button></div><label className={labelClass}>Takeaway<textarea className={`${textareaClass} min-h-20`} onChange={(event) => onUpdate(questionIndex, (item) => ({ ...item, explanation: { ...item.explanation, takeaway: event.target.value } }))} value={question.explanation.takeaway} /></label></fieldset><ValidationMetadataEditor question={question} questionIndex={questionIndex} onUpdate={onUpdate} /><div className="flex flex-wrap gap-2"><Button disabled={questionIndex === 0} onClick={() => onMove(questionIndex, -1)} size="sm" type="button" variant="outline"><ChevronUp className="size-4" /> Move up</Button><Button disabled={questionIndex === questions.length - 1} onClick={() => onMove(questionIndex, 1)} size="sm" type="button" variant="outline"><ChevronDown className="size-4" /> Move down</Button><Button disabled={questions.length <= 1} onClick={() => onRemove(questionIndex)} size="sm" type="button" variant="destructive"><Trash2 className="size-4" /> Remove question</Button></div></div></details>)}</CardContent></Card>;
}

function ValidationMetadataEditor({ question, questionIndex, onUpdate }: { question: GeneralAcademicQuestion; questionIndex: number; onUpdate: (index: number, updater: (question: GeneralAcademicQuestion) => GeneralAcademicQuestion) => void }) {
  const validation = question.validation;
  return <fieldset className="rounded-md border border-workspace-border p-4"><legend className="px-2 text-sm font-semibold">Optional deterministic validation metadata</legend><label className={labelClass}>Answer type<select className={inputClass} onChange={(event) => onUpdate(questionIndex, (item) => ({ ...item, validation: validationMetadataForType(event.target.value as "none" | typeof GENERAL_ACADEMIC_ANSWER_TYPES[number]) }))} value={validation?.answerType ?? "none"}><option value="none">None</option>{GENERAL_ACADEMIC_ANSWER_TYPES.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>{validation?.answerType === "numeric" ? <div className="mt-3 grid gap-3 sm:grid-cols-2"><label className={labelClass}>Expected value<input className={inputClass} onChange={(event) => onUpdate(questionIndex, (item) => ({ ...item, validation: { answerType: "numeric", expectedValue: Number(event.target.value), tolerance: item.validation?.answerType === "numeric" ? item.validation.tolerance : 0 } }))} type="number" value={validation.expectedValue} /></label><label className={labelClass}>Tolerance<input className={inputClass} min={0} onChange={(event) => onUpdate(questionIndex, (item) => ({ ...item, validation: { answerType: "numeric", expectedValue: item.validation?.answerType === "numeric" ? item.validation.expectedValue : 0, tolerance: Number(event.target.value) } }))} type="number" value={validation.tolerance} /></label></div> : null}{validation?.answerType === "categorical" || validation?.answerType === "text" ? <label className={`${labelClass} mt-3`}>Expected value<input className={inputClass} onChange={(event) => onUpdate(questionIndex, (item) => ({ ...item, validation: { answerType: validation.answerType, expectedValue: event.target.value } }))} value={validation.expectedValue} /></label> : null}{validation?.answerType === "boolean" ? <label className={`${labelClass} mt-3`}>Expected value<select className={inputClass} onChange={(event) => onUpdate(questionIndex, (item) => ({ ...item, validation: { answerType: "boolean", expectedValue: event.target.value === "true" } }))} value={String(validation.expectedValue)}><option value="true">True</option><option value="false">False</option></select></label> : null}</fieldset>;
}
