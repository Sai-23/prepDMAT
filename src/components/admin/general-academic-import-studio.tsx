"use client";

import { FileJson2, Upload } from "lucide-react";
import { useState } from "react";

import { GeneralAcademicEditor } from "@/components/admin/general-academic-editor";
import { GeneralAcademicPreview } from "@/components/admin/general-academic-preview";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { summarizeGeneralAcademicFindings } from "@/lib/general-academic/authoring";
import { parsePastedGeneralAcademicJson, parseUploadedGeneralAcademicJson } from "@/lib/general-academic/import-flow";
import type { GeneralAcademicImportResult } from "@/lib/general-academic/importer";

const textareaClass = "min-h-80 w-full rounded-md border border-workspace-border bg-surface-lowest p-4 font-mono text-xs leading-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";

export function GeneralAcademicImportStudio() {
  const [text, setText] = useState("");
  const [result, setResult] = useState<GeneralAcademicImportResult | null>(null);
  const [editing, setEditing] = useState(false);

  async function upload(file: File | undefined) {
    if (!file) return;
    if (!file.name.toLocaleLowerCase("en").endsWith(".json")) {
      setResult(parseUploadedGeneralAcademicJson({ name: file.name, size: file.size, text: "" }));
      return;
    }
    if (file.size > 512 * 1024) {
      setResult(parseUploadedGeneralAcademicJson({ name: file.name, size: file.size, text: "" }));
      return;
    }
    const uploadedText = await file.text();
    setText(uploadedText);
    setResult(parseUploadedGeneralAcademicJson({ name: file.name, size: file.size, text: uploadedText }));
    setEditing(false);
  }

  if (editing && result?.ok) {
    return <GeneralAcademicEditor importWarnings={result.warnings} initialPack={result.pack} mode="import" />;
  }

  const errors = result && !result.ok ? summarizeGeneralAcademicFindings(result.errors) : [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Import General Academic Pack</CardTitle><CardDescription>Paste canonical JSON or upload one .json file. Both methods use the same Phase 1 parser and do not save automatically.</CardDescription></CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 xl:grid-cols-[1fr_260px]">
            <label className="grid gap-2 text-sm font-semibold">Paste JSON<textarea className={textareaClass} onChange={(event) => { setText(event.target.value); setResult(null); }} placeholder='{"schemaVersion":"general-academic-pack@1", ...}' spellCheck={false} value={text} /></label>
            <div className="space-y-3 rounded-md border border-dashed border-workspace-border p-4"><FileJson2 className="size-7 text-primary" /><p className="font-semibold">Upload .json</p><p className="text-sm leading-6 text-muted-foreground">Maximum 512 KB. The file is read as plain text and never executed.</p><label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-workspace-border px-3 py-2 text-sm font-semibold focus-within:ring-2 focus-within:ring-primary"><Upload className="size-4" /> Choose JSON file<input accept=".json,application/json" className="sr-only" onChange={(event) => void upload(event.target.files?.[0])} type="file" /></label></div>
          </div>
          <div className="flex flex-wrap gap-2"><Button disabled={!text.trim()} onClick={() => { setResult(parsePastedGeneralAcademicJson(text)); setEditing(false); }} type="button">Validate JSON</Button><Button onClick={() => { setText(""); setResult(null); setEditing(false); }} type="button" variant="outline">Clear</Button></div>
          <p className="rounded-md bg-surface-container p-3 text-sm">Imported content will be saved as a draft. Declared provider provenance may be preserved, but review/approval state is never trusted.</p>
        </CardContent>
      </Card>

      {errors.length ? <Card><CardHeader><CardTitle>Import blocked</CardTitle></CardHeader><CardContent><ul className="space-y-2">{errors.map((finding, index) => <li className="rounded-md border border-error/30 bg-error-container p-3 text-sm" key={`${finding.path}-${index}`}><p className="font-semibold">{finding.displayPath} · {finding.code}</p><p className="mt-1">{finding.message}</p></li>)}</ul><p className="mt-4 text-sm text-muted-foreground">No database content was created.</p></CardContent></Card> : null}

      {result?.ok ? <><Card><CardHeader><CardTitle>Import preview</CardTitle><CardDescription>Canonical schema valid and pack validation passed. Review the summary before entering the editor.</CardDescription></CardHeader><CardContent className="space-y-4"><dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4"><div><dt className="text-muted-foreground">Title</dt><dd className="font-semibold">{result.pack.title}</dd></div><div><dt className="text-muted-foreground">Domain</dt><dd>{result.pack.domain}</dd></div><div><dt className="text-muted-foreground">Topic</dt><dd>{result.pack.topic}</dd></div><div><dt className="text-muted-foreground">Difficulty</dt><dd>{result.pack.difficulty}</dd></div><div><dt className="text-muted-foreground">Questions</dt><dd>{result.pack.questions.length}</dd></div><div><dt className="text-muted-foreground">Representations</dt><dd>{result.pack.stimulus.formulas.length} formulas · {result.pack.stimulus.tables.length} tables · {result.pack.stimulus.graphs.length} graphs · {result.pack.stimulus.figures.length} figures</dd></div><div><dt className="text-muted-foreground">Origin</dt><dd>{result.pack.origin}</dd></div><div><dt className="text-muted-foreground">Review status</dt><dd>draft</dd></div></dl>{result.warnings.map((warning) => <p className="rounded-md bg-warning-container p-3 text-sm" key={warning.code}>{warning.message}</p>)}<Button onClick={() => setEditing(true)} type="button">Continue to editor</Button></CardContent></Card><GeneralAcademicPreview pack={result.pack} /></> : null}
    </div>
  );
}

