import type { CanonicalGeneralAcademicPack } from "@/lib/general-academic/schemas";
import {
  deriveSimpleLatex,
  formatGeneralAcademicUnit,
  renderGeneralAcademicLatex,
} from "@/lib/general-academic/math";

type Formula = CanonicalGeneralAcademicPack["stimulus"]["formulas"][number];

export function MathExpression({ latex, fallback, block = false }: { latex?: string | null; fallback: string; block?: boolean }) {
  const requested = latex?.trim();
  const derived = requested ? null : deriveSimpleLatex(fallback);
  const rendered = renderGeneralAcademicLatex(requested ?? derived ?? "", block);
  if (!rendered.valid) {
    return <code className="block max-w-full overflow-x-auto whitespace-pre-wrap break-words font-mono text-sm" aria-label={fallback}>{fallback}</code>;
  }
  const Element = block ? "div" : "span";
  return (
    <Element
      aria-label={fallback}
      className={block ? "max-w-full overflow-x-auto py-2 text-center text-lg sm:text-xl" : "inline-block max-w-full align-middle"}
      dangerouslySetInnerHTML={{ __html: rendered.html }}
    />
  );
}

export function InlineMath({ latex, fallback }: { latex?: string | null; fallback: string }) {
  return <MathExpression fallback={fallback} latex={latex} />;
}

export function BlockMath({ latex, fallback }: { latex?: string | null; fallback: string }) {
  return <MathExpression block fallback={fallback} latex={latex} />;
}

export function FormulaCard({ formula, technical = false }: { formula: Formula; technical?: boolean }) {
  return (
    <article className="min-w-0 rounded-lg border border-workspace-border bg-surface-container p-4 sm:p-5">
      <h3 className="text-sm font-semibold">{formula.label || formula.id}</h3>
      <BlockMath fallback={formula.expression} latex={formula.display?.latex} />
      {formula.variables.length ? (
        <dl className="mt-4 divide-y divide-workspace-separator rounded-md bg-surface-lowest px-3">
          {formula.variables.map((variable, index) => (
            <div className="grid gap-1 py-3 text-sm sm:grid-cols-[minmax(5rem,0.8fr)_minmax(12rem,2fr)_minmax(5rem,0.7fr)] sm:items-center sm:gap-4" key={`${formula.id}-${variable.symbol}-${index}`}>
              <dt className="font-semibold"><InlineMath fallback={variable.symbol} latex={variable.displaySymbol} /></dt>
              <dd>{variable.meaning}</dd>
              <dd className="text-muted-foreground">{variable.unit ? formatGeneralAcademicUnit(variable.unit) : "—"}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {technical ? (
        <details className="mt-4 rounded-md border border-workspace-border bg-surface-lowest p-3 text-xs">
          <summary className="cursor-pointer font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">Technical math view</summary>
          <dl className="mt-3 grid gap-3">
            <div><dt className="text-muted-foreground">Raw expression</dt><dd className="mt-1 break-all font-mono">{formula.expression}</dd></div>
            <div><dt className="text-muted-foreground">Display LaTeX</dt><dd className="mt-1 break-all font-mono">{formula.display?.latex || "Not provided — safe fallback is active"}</dd></div>
          </dl>
        </details>
      ) : null}
    </article>
  );
}
