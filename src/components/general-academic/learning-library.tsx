"use client";

import { Bookmark, Brain, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { GeneralAcademicBookmarkItem, GeneralAcademicMistakeItem } from "@/lib/general-academic/learning-data";
import { GENERAL_ACADEMIC_DOMAIN_LABELS, GENERAL_ACADEMIC_SKILL_LABELS, type GeneralAcademicDomain, type GeneralAcademicSkill } from "@/lib/general-academic/registries";

type LibraryItem = GeneralAcademicBookmarkItem | GeneralAcademicMistakeItem;

function isMistake(item: LibraryItem): item is GeneralAcademicMistakeItem {
  return "timesIncorrect" in item;
}

export function GeneralAcademicLearningLibrary({ kind, items }: { kind: "bookmarks" | "mistakes"; items: LibraryItem[] }) {
  const [domain, setDomain] = useState<GeneralAcademicDomain | "all">("all");
  const [skill, setSkill] = useState<GeneralAcademicSkill | "all">("all");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard" | "all">("all");
  const [status, setStatus] = useState<"active" | "resolved" | "all">(kind === "mistakes" ? "active" : "all");
  const visible = useMemo(() => items.filter((item) =>
    (domain === "all" || item.pack.domain === domain)
    && (skill === "all" || item.item.question.skill === skill)
    && (difficulty === "all" || item.item.question.difficulty === difficulty)
    && (status === "all" || (isMistake(item) && item.status === status))), [difficulty, domain, items, skill, status]);
  const groups = useMemo(() => {
    const result = new Map<string, LibraryItem[]>();
    for (const item of visible) result.set(item.sourcePackId, [...(result.get(item.sourcePackId) ?? []), item]);
    return [...result.values()];
  }, [visible]);
  const domains = [...new Set(items.map((item) => item.pack.domain))];
  const skills = [...new Set(items.map((item) => item.item.question.skill))];

  return (
    <div className="space-y-5">
      {kind === "mistakes" ? <div aria-label="Mistake status" className="grid grid-cols-3 gap-2" role="group">{(["active", "resolved", "all"] as const).map((value) => <button aria-pressed={status === value} className={`min-h-11 rounded-md border px-3 text-sm font-semibold capitalize focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${status === value ? "border-primary bg-primary-muted" : "border-workspace-border"}`} key={value} onClick={() => setStatus(value)} type="button">{value}</button>)}</div> : null}
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="grid gap-1 text-sm font-semibold">Domain<select className="h-11 rounded-md border border-workspace-border bg-surface-lowest px-3 font-normal" onChange={(event) => setDomain(event.target.value as GeneralAcademicDomain | "all")} value={domain}><option value="all">All domains</option>{domains.map((value) => <option key={value} value={value}>{GENERAL_ACADEMIC_DOMAIN_LABELS[value]}</option>)}</select></label>
        <label className="grid gap-1 text-sm font-semibold">Skill<select className="h-11 rounded-md border border-workspace-border bg-surface-lowest px-3 font-normal" onChange={(event) => setSkill(event.target.value as GeneralAcademicSkill | "all")} value={skill}><option value="all">All skills</option>{skills.map((value) => <option key={value} value={value}>{GENERAL_ACADEMIC_SKILL_LABELS[value]}</option>)}</select></label>
        <label className="grid gap-1 text-sm font-semibold">Difficulty<select className="h-11 rounded-md border border-workspace-border bg-surface-lowest px-3 font-normal" onChange={(event) => setDifficulty(event.target.value as typeof difficulty)} value={difficulty}><option value="all">All difficulties</option><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select></label>
      </div>
      <p aria-live="polite" className="text-sm text-muted-foreground">Showing {visible.length} {kind === "bookmarks" ? "bookmarked questions" : "mistakes"} in {groups.length} source pack{groups.length === 1 ? "" : "s"}.</p>
      {groups.length ? <div className="space-y-4">{groups.map((group) => {
        const first = group[0];
        return <Card key={first.sourcePackId}><CardHeader><div className="flex flex-wrap items-center gap-2"><Badge>{GENERAL_ACADEMIC_DOMAIN_LABELS[first.pack.domain]}</Badge><Badge variant="subtle">PrepDMAT {first.pack.difficulty}</Badge></div><CardTitle className="mt-2">{first.pack.title}</CardTitle><p className="text-sm text-muted-foreground">{group.length} {kind === "bookmarks" ? "bookmarked question" : "mistake"}{group.length === 1 ? "" : "s"}</p></CardHeader><CardContent><ol className="divide-y divide-workspace-separator">{group.map((item) => <li className="py-3 first:pt-0 last:pb-0" key={item.id}><Link className="flex min-h-11 items-center justify-between gap-4 rounded-md px-2 py-2 hover:bg-surface-low focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" href={`/practice/general-academic/${kind}/${item.id}`}><span><strong className="block">Question {item.item.question.order} · {GENERAL_ACADEMIC_SKILL_LABELS[item.item.question.skill]}</strong><span className="mt-1 block text-xs text-muted-foreground">{isMistake(item) ? `${item.status === "active" ? "Active" : "Resolved"} · Missed ${item.timesIncorrect} time${item.timesIncorrect === 1 ? "" : "s"}` : item.item.question.prompt}</span></span><ChevronRight className="size-4 shrink-0" /></Link></li>)}</ol></CardContent></Card>;
      })}</div> : <Card><CardContent className="p-8 text-center">{kind === "bookmarks" ? <Bookmark className="mx-auto size-8 text-primary" /> : <Brain className="mx-auto size-8 text-primary" />}<h2 className="mt-3 text-lg font-semibold">No matching {kind}</h2><p className="mt-2 text-sm text-muted-foreground">Adjust the filters to see other source-aware review items.</p></CardContent></Card>}
    </div>
  );
}
