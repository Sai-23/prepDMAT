"use client";

import type { Route } from "next";
import Link from "next/link";
import { Upload } from "lucide-react";
import { useRef, useState, useTransition } from "react";

import { previewGeneralAcademicBatchImportAction, saveGeneralAcademicBatchImportAction, type GeneralAcademicBatchGenerationResult } from "@/app/admin/general-academic/phase8-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { GeneralAcademicBatchImportItem } from "@/lib/general-academic/batch";

const textareaClass = "min-h-64 w-full rounded-md border border-workspace-border bg-surface-lowest p-4 font-mono text-xs leading-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";

export function GeneralAcademicBatchImportStudio() {
  const [text, setText] = useState("");
  const [items, setItems] = useState<GeneralAcademicBatchImportItem[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [saveResult, setSaveResult] = useState<GeneralAcademicBatchGenerationResult | null>(null);
  const [pending, startTransition] = useTransition();
  const submitting = useRef(false);

  function preview() {
    if (submitting.current || !text.trim()) return;
    submitting.current = true;
    setMessage(null);
    setSaveResult(null);
    startTransition(async () => {
      try {
        const result = await previewGeneralAcademicBatchImportAction(text);
        setItems(result.items);
        setSelected(result.items.filter((item) => item.ok && item.pack).map((item) => item.index));
        setMessage(result.message);
      } catch {
        setMessage("Batch preview failed safely. No content was saved.");
      } finally {
        submitting.current = false;
      }
    });
  }

  function save() {
    if (submitting.current || !selected.length) return;
    const packs = items.filter((item) => selected.includes(item.index) && item.ok && item.pack).map((item) => item.pack);
    submitting.current = true;
    startTransition(async () => {
      try {
        const result = await saveGeneralAcademicBatchImportAction(packs);
        setSaveResult(result);
        setMessage(result.message);
        if (result.ok) setSelected([]);
      } catch {
        setMessage("Selected drafts could not be saved safely.");
      } finally {
        submitting.current = false;
      }
    });
  }

  async function upload(file: File | undefined) {
    if (!file) return;
    if (!file.name.toLocaleLowerCase("en").endsWith(".json")) {
      setMessage("Choose a .json file.");
      return;
    }
    if (file.size > 512 * 1024) {
      setMessage("Batch JSON exceeds the 512 KB import limit.");
      return;
    }
    setText(await file.text());
    setItems([]);
    setSelected([]);
    setSaveResult(null);
    setMessage("File loaded. Preview the batch before saving.");
  }

  return (
    <Card>
      <CardHeader><CardTitle>Batch JSON import</CardTitle><CardDescription>Import a JSON array or an object with a <code>packs</code> array. Up to 20 packs and 512 KB are parsed, normalized, validated, and compared independently. Preview never writes to the database.</CardDescription></CardHeader>
      <CardContent className="space-y-5">
        <label className="grid gap-2 text-sm font-semibold">Batch JSON<textarea className={textareaClass} onChange={(event) => { setText(event.target.value); setItems([]); setSelected([]); setSaveResult(null); }} placeholder='[{"schemaVersion":"general-academic-pack@1", ...}]' spellCheck={false} value={text} /></label>
        <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-workspace-border px-4 py-2 text-sm font-semibold focus-within:ring-2 focus-within:ring-primary"><Upload className="size-4" /> Upload batch .json<input accept=".json,application/json" className="sr-only" onChange={(event) => void upload(event.target.files?.[0])} type="file" /></label>
        <div className="flex flex-wrap items-center gap-3"><Button disabled={pending || !text.trim()} onClick={preview} type="button">{pending && !items.length ? "Checking packs…" : "Preview batch"}</Button><Button disabled={pending || !selected.length} onClick={save} type="button" variant="outline">{pending && items.length ? "Saving selected…" : `Save ${selected.length || "selected"} drafts`}</Button><span aria-live="polite" className="text-sm text-muted-foreground">{message}</span></div>
        {items.length ? <div className="space-y-3" role="list">{items.map((item) => <div className="rounded-lg border border-workspace-border p-4" key={item.index} role="listitem"><div className="flex items-start gap-3"><input aria-label={`Select ${item.title}`} checked={selected.includes(item.index)} className="mt-1 size-4" disabled={!item.ok || !item.pack || pending} onChange={(event) => setSelected((current) => event.target.checked ? [...new Set([...current, item.index])] : current.filter((value) => value !== item.index))} type="checkbox" /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{item.title}</p><Badge variant={item.ok ? "success" : "warning"}>{item.ok ? "Valid draft" : "Blocked"}</Badge>{item.similarity.length ? <Badge variant="warning">Possible duplicate</Badge> : null}</div><p className="mt-1 text-sm text-muted-foreground">{item.errors.length} errors · {item.blocking.length} blocking quality issues · {item.qualityWarnings.length} warnings · {item.similarity.length} similarity alerts</p>{item.errors.length || item.blocking.length ? <ul className="mt-2 space-y-1 text-sm">{item.errors.slice(0, 4).map((error, index) => <li key={`${error.path}-${index}`}>{error.code}: {error.message}</li>)}{item.blocking.slice(0, 4).map((value) => <li key={value}>{value}</li>)}</ul> : null}{item.similarity.length ? <p className="mt-2 text-sm">Review signals: {[...new Set(item.similarity.flatMap((alert) => alert.kinds))].join(", ").replaceAll("_", " ")}.</p> : null}</div></div></div>)}</div> : null}
        {saveResult?.items.length ? <ul className="space-y-2 text-sm">{saveResult.items.map((item) => <li className={`rounded-md border p-3 ${item.status === "saved" ? "border-success/30 bg-success-container" : "border-warning/30 bg-warning-container"}`} key={item.index}><strong>{item.title}:</strong> {item.message}{item.id ? <> <Link className="font-semibold underline" href={`/admin/general-academic/${item.id}/edit` as Route}>Open draft</Link></> : null}</li>)}</ul> : null}
      </CardContent>
    </Card>
  );
}
