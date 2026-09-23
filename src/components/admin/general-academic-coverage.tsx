import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { GeneralAcademicCoverage } from "@/lib/general-academic/content-intelligence";
import {
  GENERAL_ACADEMIC_DIFFICULTIES,
  GENERAL_ACADEMIC_DOMAINS,
  GENERAL_ACADEMIC_DOMAIN_LABELS,
  GENERAL_ACADEMIC_SKILLS,
  GENERAL_ACADEMIC_SKILL_LABELS,
} from "@/lib/general-academic/registries";
import { GENERAL_ACADEMIC_REPRESENTATIONS } from "@/lib/general-academic/ai/generation-config";

function label(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function State({ value }: { value: "good" | "low" | "missing" }) {
  return <Badge variant={value === "good" ? "success" : "warning"}>{label(value)}</Badge>;
}

const tableClass = "w-full min-w-[700px] border-collapse text-left text-sm";
const headingClass = "border-b border-workspace-border bg-surface-container px-3 py-2 font-semibold";
const cellClass = "border-b border-workspace-border px-3 py-2 align-top";

export function GeneralAcademicCoverageDashboard({ coverage }: { coverage: GeneralAcademicCoverage }) {
  return (
    <div className="space-y-6">
      <p className="rounded-lg border border-workspace-border bg-surface-container p-4 text-sm">Coverage status uses transparent PrepDMAT internal content targets. It does not describe an official dMAT distribution.</p>
      <Card><CardHeader><CardTitle>Domain coverage</CardTitle><CardDescription>Archived content is excluded from active coverage.</CardDescription></CardHeader><CardContent className="overflow-x-auto"><table className={tableClass}><thead><tr><th className={headingClass} scope="col">Domain</th><th className={headingClass} scope="col">All packs</th><th className={headingClass} scope="col">Questions</th><th className={headingClass} scope="col">Published</th><th className={headingClass} scope="col">Draft</th><th className={headingClass} scope="col">Needs review</th><th className={headingClass} scope="col">Status</th></tr></thead><tbody>{GENERAL_ACADEMIC_DOMAINS.map((domain) => { const value = coverage.domains[domain]; return <tr key={domain}><th className={cellClass} scope="row">{GENERAL_ACADEMIC_DOMAIN_LABELS[domain]}</th><td className={cellClass}>{value.packs}</td><td className={cellClass}>{value.questions}</td><td className={cellClass}>{value.publishedPacks} packs · {value.publishedQuestions} questions</td><td className={cellClass}>{value.draftPacks}</td><td className={cellClass}>{value.needsReviewPacks}</td><td className={cellClass}><State value={value.state} /></td></tr>; })}</tbody></table></CardContent></Card>

      <Card><CardHeader><CardTitle>Skill coverage</CardTitle><CardDescription>All 15 canonical skills; no secondary taxonomy is introduced.</CardDescription></CardHeader><CardContent className="overflow-x-auto"><table className={tableClass}><thead><tr><th className={headingClass} scope="col">Skill</th><th className={headingClass} scope="col">All questions</th><th className={headingClass} scope="col">Published questions</th><th className={headingClass} scope="col">Packs containing skill</th><th className={headingClass} scope="col">Published packs</th><th className={headingClass} scope="col">Status</th></tr></thead><tbody>{GENERAL_ACADEMIC_SKILLS.map((skill) => { const value = coverage.skills[skill]; return <tr key={skill}><th className={cellClass} scope="row">{GENERAL_ACADEMIC_SKILL_LABELS[skill]}</th><td className={cellClass}>{value.questions}</td><td className={cellClass}>{value.publishedQuestions}</td><td className={cellClass}>{value.packs}</td><td className={cellClass}>{value.publishedPacks}</td><td className={cellClass}><State value={value.state} /></td></tr>; })}</tbody></table></CardContent></Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card><CardHeader><CardTitle>Difficulty coverage</CardTitle><CardDescription>PrepDMAT difficulty classification.</CardDescription></CardHeader><CardContent className="space-y-3">{GENERAL_ACADEMIC_DIFFICULTIES.map((difficulty) => { const value = coverage.difficulties[difficulty]; return <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-workspace-border p-3" key={difficulty}><div><p className="font-semibold">{label(difficulty)}</p><p className="text-sm text-muted-foreground">{value.publishedQuestions} published questions · {value.publishedPacks} packs</p></div><State value={value.state} /></div>; })}</CardContent></Card>
        <Card><CardHeader><CardTitle>Representation coverage</CardTitle><CardDescription>A pack may contribute to multiple representation types.</CardDescription></CardHeader><CardContent className="space-y-3">{GENERAL_ACADEMIC_REPRESENTATIONS.map((representation) => { const value = coverage.representations[representation]; return <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-workspace-border p-3" key={representation}><div><p className="font-semibold">{label(representation)}</p><p className="text-sm text-muted-foreground">{value.publishedPacks} published packs · {value.publishedQuestions} linked questions</p></div><State value={value.state} /></div>; })}</CardContent></Card>
      </div>

      <CrossMatrix title="Domain × Skill" columns={GENERAL_ACADEMIC_SKILLS.map((skill) => ({ key: skill, label: GENERAL_ACADEMIC_SKILL_LABELS[skill] }))} rows={GENERAL_ACADEMIC_DOMAINS.map((domain) => ({ key: domain, label: GENERAL_ACADEMIC_DOMAIN_LABELS[domain], values: coverage.cross.domainSkill[domain] }))} />
      <CrossMatrix title="Domain × Difficulty" columns={GENERAL_ACADEMIC_DIFFICULTIES.map((value) => ({ key: value, label: label(value) }))} rows={GENERAL_ACADEMIC_DOMAINS.map((domain) => ({ key: domain, label: GENERAL_ACADEMIC_DOMAIN_LABELS[domain], values: coverage.cross.domainDifficulty[domain] }))} />
      <CrossMatrix title="Skill × Difficulty" columns={GENERAL_ACADEMIC_DIFFICULTIES.map((value) => ({ key: value, label: label(value) }))} rows={GENERAL_ACADEMIC_SKILLS.map((skill) => ({ key: skill, label: GENERAL_ACADEMIC_SKILL_LABELS[skill], values: coverage.cross.skillDifficulty[skill] }))} />
      <CrossMatrix title="Domain × Representation" columns={GENERAL_ACADEMIC_REPRESENTATIONS.map((value) => ({ key: value, label: label(value) }))} rows={GENERAL_ACADEMIC_DOMAINS.map((domain) => ({ key: domain, label: GENERAL_ACADEMIC_DOMAIN_LABELS[domain], values: coverage.cross.domainRepresentation[domain] }))} />
    </div>
  );
}

function CrossMatrix({ title, columns, rows }: { title: string; columns: Array<{ key: string; label: string }>; rows: Array<{ key: string; label: string; values: Record<string, number> }> }) {
  return <Card><CardHeader><CardTitle>{title}</CardTitle><CardDescription>Published question or pack contribution. Zero cells are shown explicitly.</CardDescription></CardHeader><CardContent className="overflow-x-auto"><table className={tableClass}><thead><tr><th className={headingClass} scope="col">Coverage row</th>{columns.map((column) => <th className={headingClass} key={column.key} scope="col">{column.label}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={row.key}><th className={cellClass} scope="row">{row.label}</th>{columns.map((column) => <td className={cellClass} key={column.key}>{row.values[column.key] ?? 0}<span className="sr-only"> {row.values[column.key] ? "covered" : "missing"}</span></td>)}</tr>)}</tbody></table></CardContent></Card>;
}
