import { AlertTriangle, CheckCircle2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { summarizeGeneralAcademicFindings } from "@/lib/general-academic/authoring";
import { createGeneralAcademicContentFingerprint } from "@/lib/general-academic/fingerprint";
import type { CanonicalGeneralAcademicPack } from "@/lib/general-academic/schemas";
import type { GeneralAcademicValidationFinding } from "@/lib/general-academic/validation";

export function GeneralAcademicValidationPanel({
  pack,
  errors,
  warnings = [],
}: {
  pack: CanonicalGeneralAcademicPack;
  errors: GeneralAcademicValidationFinding[];
  warnings?: GeneralAcademicValidationFinding[];
}) {
  const valid = errors.length === 0;
  const displayErrors = summarizeGeneralAcademicFindings(errors);
  const displayWarnings = summarizeGeneralAcademicFindings(warnings);

  return (
    <Card aria-live="polite">
      <CardHeader className="flex-row items-center justify-between gap-4">
        <CardTitle>Validation</CardTitle>
        <Badge variant={valid ? "success" : "warning"}>{valid ? "Canonical pack valid" : `${errors.length} errors`}</Badge>
      </CardHeader>
      <CardContent className="space-y-5">
        <dl className="grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-3">
          <div><dt className="text-muted-foreground">Schema</dt><dd className="font-semibold">general-academic-pack@1</dd></div>
          <div><dt className="text-muted-foreground">Questions</dt><dd className="font-semibold">{pack.questions.length}</dd></div>
          <div><dt className="text-muted-foreground">Options</dt><dd className="font-semibold">Four fixed options per question</dd></div>
          <div><dt className="text-muted-foreground">Explanations</dt><dd className="font-semibold">Structured</dd></div>
          <div><dt className="text-muted-foreground">Representations</dt><dd className="font-semibold">{pack.stimulus.formulas.length}F / {pack.stimulus.tables.length}T / {pack.stimulus.graphs.length}G / {pack.stimulus.figures.length}D</dd></div>
          <div className="min-w-0"><dt className="text-muted-foreground">Fingerprint</dt><dd className="truncate font-mono text-xs font-semibold">{valid ? createGeneralAcademicContentFingerprint(pack) : "Pending valid content"}</dd></div>
        </dl>

        {displayErrors.length ? (
          <section aria-labelledby="gam-errors-heading" className="space-y-2">
            <h3 className="flex items-center gap-2 font-semibold text-error" id="gam-errors-heading"><AlertTriangle className="size-4" /> Errors</h3>
            <ul className="space-y-2">
              {displayErrors.map((finding, index) => (
                <li className="rounded-md border border-error/30 bg-error-container p-3 text-sm text-error-container-foreground" key={`${finding.path}-${finding.code}-${index}`}>
                  <p className="font-semibold">{finding.displayPath} · {finding.code}</p>
                  <p className="mt-1">{finding.message}</p>
                </li>
              ))}
            </ul>
          </section>
        ) : (
          <p className="flex items-center gap-2 text-sm text-success"><CheckCircle2 className="size-4" /> Canonical schema and pack validation passed.</p>
        )}

        {displayWarnings.length ? (
          <section aria-labelledby="gam-warnings-heading" className="space-y-2">
            <h3 className="font-semibold" id="gam-warnings-heading">Warnings</h3>
            <ul className="space-y-2 text-sm">
              {displayWarnings.map((finding, index) => (
                <li className="rounded-md border border-warning/30 bg-warning-container p-3" key={`${finding.path}-${finding.code}-${index}`}>
                  <span className="font-semibold">{finding.displayPath} · {finding.code}: </span>{finding.message}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </CardContent>
    </Card>
  );
}

