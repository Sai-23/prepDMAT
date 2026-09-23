"use client";

import { Clipboard, Download, FileJson2, RotateCcw, Sparkles } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { startTransition, useRef, useState } from "react";

import {
  generateGeneralAcademicWithAIAction,
  type GeneralAcademicGenerationActionResult,
} from "@/app/admin/general-academic/generation-actions";
import {
  generateGeneralAcademicBatchAction,
  type GeneralAcademicBatchGenerationResult,
} from "@/app/admin/general-academic/phase8-actions";
import { GeneralAcademicEditor } from "@/components/admin/general-academic-editor";
import { GeneralAcademicPreview } from "@/components/admin/general-academic-preview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DEFAULT_GENERAL_ACADEMIC_GENERATION_CONFIG,
  GENERAL_ACADEMIC_REPRESENTATIONS,
  generalAcademicGenerationConfigSchema,
  type GeneralAcademicGenerationConfig,
} from "@/lib/general-academic/ai/generation-config";
import type { GamGenerationProviderStatus } from "@/lib/general-academic/ai/types";
import { exportGeneralAcademicPackJson } from "@/lib/general-academic/export";
import { buildGeneralAcademicExternalPrompt } from "@/lib/general-academic/external-prompt";
import {
  GENERAL_ACADEMIC_DIFFICULTIES,
  GENERAL_ACADEMIC_DOMAINS,
  GENERAL_ACADEMIC_DOMAIN_LABELS,
  GENERAL_ACADEMIC_SKILLS,
  GENERAL_ACADEMIC_SKILL_LABELS,
} from "@/lib/general-academic/registries";

const inputClass = "h-10 w-full min-w-0 rounded-md border border-workspace-border bg-surface-lowest px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";
const labelClass = "grid min-w-0 gap-1.5 text-sm font-semibold";

function downloadJson(pack: Extract<GeneralAcademicGenerationActionResult, { ok: true }>["pack"]) {
  const blob = new Blob([exportGeneralAcademicPackJson(pack)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${pack.title.toLocaleLowerCase("en").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "general-academic-pack"}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function GeneralAcademicGenerationStudio({ status, initialConfig = DEFAULT_GENERAL_ACADEMIC_GENERATION_CONFIG }: { status: GamGenerationProviderStatus; initialConfig?: GeneralAcademicGenerationConfig }) {
  const [config, setConfig] = useState<GeneralAcademicGenerationConfig>(initialConfig);
  const [result, setResult] = useState<GeneralAcademicGenerationActionResult | null>(null);
  const [editing, setEditing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [batchGenerating, setBatchGenerating] = useState(false);
  const [batchCount, setBatchCount] = useState(2);
  const [batchResult, setBatchResult] = useState<GeneralAcademicBatchGenerationResult | null>(null);
  const [promptStatus, setPromptStatus] = useState<string | null>(null);
  const submittingRef = useRef(false);

  function patchConfig(patch: Partial<GeneralAcademicGenerationConfig>) {
    setConfig((current) => ({ ...current, ...patch }));
  }

  function generate() {
    if (submittingRef.current || !status.configured) return;
    const parsed = generalAcademicGenerationConfigSchema.safeParse(config);
    if (!parsed.success) {
      setResult({ ok: false, error: { code: "CANONICAL_VALIDATION", message: "Check the generation settings and try again.", retryable: false } });
      return;
    }
    submittingRef.current = true;
    setGenerating(true);
    setEditing(false);
    startTransition(async () => {
      try {
        const nextResult = await generateGeneralAcademicWithAIAction(parsed.data);
        setResult(nextResult);
      } catch {
        setResult({ ok: false, error: { code: "GATEWAY_UNKNOWN", message: "Generation failed safely. Try again or use JSON Import.", retryable: true } });
      } finally {
        submittingRef.current = false;
        setGenerating(false);
      }
    });
  }

  function generateBatch() {
    if (submittingRef.current || !status.configured || batchCount < 1 || batchCount > 5) return;
    const parsed = generalAcademicGenerationConfigSchema.safeParse(config);
    if (!parsed.success) {
      setBatchResult({ ok: false, message: "Check the generation settings and try again.", items: [] });
      return;
    }
    submittingRef.current = true;
    setBatchGenerating(true);
    setBatchResult(null);
    startTransition(async () => {
      try {
        setBatchResult(await generateGeneralAcademicBatchAction({ config: parsed.data, packCount: batchCount }));
      } catch {
        setBatchResult({ ok: false, message: "Batch generation failed safely. No unchecked content was published.", items: [] });
      } finally {
        submittingRef.current = false;
        setBatchGenerating(false);
      }
    });
  }

  async function copyExternalPrompt() {
    const parsed = generalAcademicGenerationConfigSchema.safeParse(config);
    if (!parsed.success) {
      setPromptStatus("Check the generation settings before copying the prompt.");
      return;
    }
    try {
      await navigator.clipboard.writeText(buildGeneralAcademicExternalPrompt(parsed.data));
      setPromptStatus("Provider-neutral prompt copied.");
    } catch {
      setPromptStatus("Unable to copy. Check clipboard permission and try again.");
    }
  }

  if (editing && result?.ok) {
    return (
      <div className="space-y-5">
        <Button onClick={() => setEditing(false)} type="button" variant="outline">Back to generation preview</Button>
        <GeneralAcademicEditor initialPack={result.pack} mode="generated" />
      </div>
    );
  }

  const representationLabel = (value: (typeof GENERAL_ACADEMIC_REPRESENTATIONS)[number]) => value[0].toUpperCase() + value.slice(1);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={status.configured ? "success" : "warning"}>AI generation: {status.configured ? "Configured" : "Not configured"}</Badge>
            {status.configured ? <Badge variant="subtle">Route: {status.route}</Badge> : null}
          </div>
          <CardTitle>Generation configuration</CardTitle>
          <CardDescription>All settings are validated server-side. The selected topic is treated as subject-matter data, not instructions.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <label className={labelClass}>Domain *<select className={inputClass} onChange={(event) => patchConfig({ domain: event.target.value as GeneralAcademicGenerationConfig["domain"] })} value={config.domain}>{GENERAL_ACADEMIC_DOMAINS.map((domain) => <option key={domain} value={domain}>{GENERAL_ACADEMIC_DOMAIN_LABELS[domain]}</option>)}</select></label>
            <label className={`${labelClass} md:col-span-2`}>Topic<input className={inputClass} maxLength={200} onChange={(event) => patchConfig({ topic: event.target.value || undefined })} placeholder="Optional focused academic scenario" value={config.topic ?? ""} /></label>
            <label className={labelClass}>Pack difficulty *<select className={inputClass} onChange={(event) => patchConfig({ packDifficulty: event.target.value as GeneralAcademicGenerationConfig["packDifficulty"] })} value={config.packDifficulty}>{GENERAL_ACADEMIC_DIFFICULTIES.map((difficulty) => <option key={difficulty} value={difficulty}>{difficulty[0].toUpperCase() + difficulty.slice(1)}</option>)}</select></label>
            <label className={labelClass}>Question count *<input className={inputClass} max={20} min={1} onChange={(event) => patchConfig({ questionCount: Number(event.target.value) })} type="number" value={config.questionCount} /></label>
          </div>

          <details className="rounded-md border border-workspace-border bg-surface-container p-4">
            <summary className="cursor-pointer font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">Advanced options</summary>
            <div className="mt-5 space-y-6">
              <fieldset>
                <legend className="text-sm font-semibold">Target skills</legend>
                <p className="mt-1 text-xs text-muted-foreground">Leave all unselected for AUTO selection based on the source and requested difficulty.</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{GENERAL_ACADEMIC_SKILLS.map((skill) => <label className="flex min-w-0 items-start gap-2 rounded-md border border-workspace-border bg-surface-lowest p-3 text-sm" key={skill}><input checked={config.skills.includes(skill)} className="mt-0.5" onChange={(event) => patchConfig({ skills: event.target.checked ? [...config.skills, skill] : config.skills.filter((value) => value !== skill) })} type="checkbox" /><span>{GENERAL_ACADEMIC_SKILL_LABELS[skill]}</span></label>)}</div>
              </fieldset>
              <fieldset>
                <legend className="text-sm font-semibold">Representation preferences</legend>
                <p className="mt-1 text-xs text-muted-foreground">Text is required. Leave the others clear for AUTO selection where academically useful.</p>
                <div className="mt-3 flex flex-wrap gap-3">{GENERAL_ACADEMIC_REPRESENTATIONS.map((representation) => <label className="flex min-h-11 items-center gap-2 rounded-md border border-workspace-border bg-surface-lowest px-4 py-2 text-sm" key={representation}><input checked={config.representations.includes(representation)} disabled={representation === "text"} onChange={(event) => patchConfig({ representations: event.target.checked ? [...config.representations, representation] : config.representations.filter((value) => value !== representation) })} type="checkbox" />{representationLabel(representation)}{representation === "text" ? " (required)" : ""}</label>)}</div>
              </fieldset>
            </div>
          </details>

          {!status.configured ? <div className="rounded-md border border-warning/40 bg-warning-container p-4 text-sm"><p className="font-semibold">AI generation isn&apos;t configured.</p><p className="mt-1 leading-6">You can still generate a compatible pack using another AI provider and import the canonical JSON.</p></div> : null}

          <div className="flex flex-wrap items-center gap-3">
            <Button disabled={generating || !status.configured} onClick={generate} type="button"><Sparkles className="size-4" /> {generating ? "Generating…" : result?.ok ? "Generate Pack Again" : "Generate Pack"}</Button>
            <Button onClick={() => void copyExternalPrompt()} type="button" variant="outline"><Clipboard className="size-4" /> Copy external-AI prompt</Button>
            <Button asChild variant="outline"><Link href={"/admin/general-academic/import" as Route}><FileJson2 className="size-4" /> Import JSON</Link></Button>
            <span aria-live="polite" className="text-sm text-muted-foreground">{promptStatus}</span>
          </div>
          {status.configured ? <p className="text-xs text-muted-foreground">Server protections: {status.dailyLimit} whole-pack generations per administrator per day and a {Math.round(status.timeoutMs / 1000)}-second provider timeout.</p> : null}

          <div className="rounded-md border border-workspace-border bg-surface-container p-4">
            <h3 className="font-semibold">Small batch draft generation</h3>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">Generate 1–5 varied packs using the same configuration. Every pack independently consumes the existing generation limit, validates, checks similarity, and saves only as a draft.</p>
            <div className="mt-4 flex flex-wrap items-end gap-3"><label className="grid gap-1 text-sm font-semibold">Pack count<input className={`${inputClass} w-28`} max={5} min={1} onChange={(event) => setBatchCount(Number(event.target.value))} type="number" value={batchCount} /></label><Button disabled={generating || batchGenerating || !status.configured || batchCount < 1 || batchCount > 5} onClick={generateBatch} type="button" variant="secondary"><Sparkles className="size-4" /> {batchGenerating ? "Generating drafts…" : "Generate & save drafts"}</Button></div>
            {batchResult ? <div aria-live="polite" className="mt-4 space-y-2 text-sm"><p className="font-semibold">{batchResult.message}</p>{batchResult.items.length ? <ul className="space-y-2">{batchResult.items.map((item) => <li className={`rounded-md border p-3 ${item.status === "saved" ? "border-success/30 bg-success-container" : "border-warning/30 bg-warning-container"}`} key={item.index}><strong>{item.title}:</strong> {item.message}{item.id ? <> <Link className="font-semibold underline" href={`/admin/general-academic/${item.id}/edit` as Route}>Open draft</Link></> : null}<span className="block text-xs text-muted-foreground">{item.warningCount} warnings{item.similarityKinds.length ? ` · ${item.similarityKinds.join(", ").replaceAll("_", " ")}` : ""}</span></li>)}</ul> : null}</div> : null}
          </div>
        </CardContent>
      </Card>

      {result && !result.ok ? <Card><CardHeader><CardTitle>Generation unavailable</CardTitle><CardDescription>{result.error.message}</CardDescription></CardHeader><CardContent className="flex flex-wrap gap-2"><Button asChild><Link href={"/admin/general-academic/import" as Route}><FileJson2 className="size-4" /> Import JSON</Link></Button><Button onClick={() => void copyExternalPrompt()} type="button" variant="outline"><Clipboard className="size-4" /> Copy external-AI prompt</Button>{result.error.retryable && status.configured ? <Button disabled={generating} onClick={generate} type="button" variant="outline"><RotateCcw className="size-4" /> Retry</Button> : null}</CardContent></Card> : null}

      {result?.ok ? <>
        <Card>
          <CardHeader><CardTitle>Generation complete</CardTitle><CardDescription>Structure valid. This confirms canonical structure, not factual correctness; content review is still required.</CardDescription></CardHeader>
          <CardContent className="space-y-5">
            <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <div><dt className="text-muted-foreground">Title</dt><dd className="font-semibold">{result.pack.title}</dd></div>
              <div><dt className="text-muted-foreground">Domain</dt><dd>{GENERAL_ACADEMIC_DOMAIN_LABELS[result.pack.domain]}</dd></div>
              <div><dt className="text-muted-foreground">Topic</dt><dd>{result.pack.topic}</dd></div>
              <div><dt className="text-muted-foreground">Difficulty</dt><dd>{result.pack.difficulty}</dd></div>
              <div><dt className="text-muted-foreground">Questions</dt><dd>{result.pack.questions.length}</dd></div>
              <div><dt className="text-muted-foreground">Representations</dt><dd>{result.pack.stimulus.formulas.length} formulas · {result.pack.stimulus.tables.length} tables · {result.pack.stimulus.graphs.length} graphs · {result.pack.stimulus.figures.length} figures</dd></div>
              <div><dt className="text-muted-foreground">Skills used</dt><dd>{[...new Set(result.pack.questions.map((question) => GENERAL_ACADEMIC_SKILL_LABELS[question.skill]))].join(", ")}</dd></div>
              <div><dt className="text-muted-foreground">Validation</dt><dd>Structure valid</dd></div>
              <div><dt className="text-muted-foreground">Route</dt><dd>{result.generationMeta.route}</dd></div>
              <div><dt className="text-muted-foreground">Usage</dt><dd>{result.usage ? `${result.usage.inputTokens.toLocaleString("en")} input · ${result.usage.outputTokens.toLocaleString("en")} output · ${result.usage.totalTokens.toLocaleString("en")} total tokens` : "Not supplied"}</dd></div>
            </dl>
            {result.duplicateTitles.length ? <p className="rounded-md bg-warning-container p-3 text-sm">Identical content already exists: {result.duplicateTitles.join(", ")}. Nothing was overwritten.</p> : null}
            {result.duplicateCheckUnavailable ? <p className="rounded-md bg-warning-container p-3 text-sm">Structure is valid, but duplicate lookup is temporarily unavailable. Review carefully before saving.</p> : null}
            <p className="rounded-md bg-surface-container p-3 text-sm">No database content has been created. Save Draft in the editor is the first persistence point.</p>
            <div className="flex flex-wrap gap-2"><Button onClick={() => setEditing(true)} type="button">Continue to editor</Button><Button disabled={generating} onClick={generate} type="button" variant="outline"><RotateCcw className="size-4" /> Generate again</Button><Button onClick={() => downloadJson(result.pack)} type="button" variant="outline"><Download className="size-4" /> Export JSON</Button></div>
          </CardContent>
        </Card>
        <GeneralAcademicPreview pack={result.pack} />
      </> : null}
    </div>
  );
}
