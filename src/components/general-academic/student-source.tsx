import { FormulaCard } from "@/components/general-academic/math-expression";
import type { StudentGeneralAcademicPack } from "@/lib/general-academic/practice";

type Graph = StudentGeneralAcademicPack["stimulus"]["graphs"][number];

function StructuredGraph({ graph }: { graph: Graph }) {
  const points = graph.series.flatMap((series) => series.points);
  if (!points.length) return <p className="text-sm text-muted-foreground">Graph data is unavailable.</p>;
  const xValues = points.map((point) => point.x);
  const yValues = points.map((point) => point.y);
  const xMin = Math.min(...xValues);
  const xMax = Math.max(...xValues);
  const yMin = Math.min(0, ...yValues);
  const yMax = Math.max(...yValues);
  const xScale = (value: number) => 48 + ((value - xMin) / (xMax - xMin || 1)) * 544;
  const yScale = (value: number) => 232 - ((value - yMin) / (yMax - yMin || 1)) * 192;
  const description = graph.series.map((series) => `${series.name}: ${series.points.map((point) => `${point.x}, ${point.y}`).join("; ")}`).join(". ");
  return (
    <figure className="min-w-0 rounded-lg border border-workspace-border bg-surface-lowest p-3">
      {graph.title ? <figcaption className="mb-2 font-semibold">{graph.title}</figcaption> : null}
      <div className="overflow-x-auto">
        <svg aria-labelledby={`${graph.id}-title ${graph.id}-description`} className="h-auto min-w-[560px] max-w-full" role="img" viewBox="0 0 640 280">
          <title id={`${graph.id}-title`}>{graph.title || `${graph.type} graph`}</title>
          <desc id={`${graph.id}-description`}>{description}</desc>
          <line stroke="currentColor" strokeWidth="1.5" x1="48" x2="592" y1="232" y2="232" />
          <line stroke="currentColor" strokeWidth="1.5" x1="48" x2="48" y1="40" y2="232" />
          {graph.series.map((series, seriesIndex) => {
            const color = ["var(--primary)", "var(--success)", "var(--warning)"][seriesIndex % 3];
            if (graph.type === "bar") {
              const width = Math.max(10, 360 / Math.max(1, points.length));
              return <g key={`${graph.id}-${series.name}`}>{series.points.map((point, index) => <rect fill={color} height={232 - yScale(point.y)} key={`${point.x}-${point.y}-${index}`} width={width} x={xScale(point.x) - width / 2 + seriesIndex * 3} y={yScale(point.y)} />)}</g>;
            }
            const path = series.points.map((point, index) => `${index ? "L" : "M"} ${xScale(point.x)} ${yScale(point.y)}`).join(" ");
            return <g key={`${graph.id}-${series.name}`}>{graph.type === "line" ? <path d={path} fill="none" stroke={color} strokeWidth="3" /> : null}{series.points.map((point, index) => <circle cx={xScale(point.x)} cy={yScale(point.y)} fill={color} key={`${point.x}-${point.y}-${index}`} r="5" />)}</g>;
          })}
          <text fontSize="13" textAnchor="middle" x="320" y="270">{graph.xAxis.label}{graph.xAxis.unit ? ` (${graph.xAxis.unit})` : ""}</text>
          <text fontSize="13" textAnchor="middle" transform="rotate(-90 16 136)" x="16" y="136">{graph.yAxis.label}{graph.yAxis.unit ? ` (${graph.yAxis.unit})` : ""}</text>
        </svg>
      </div>
      <ul className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">{graph.series.map((series) => <li key={series.name}>{series.name}</li>)}</ul>
    </figure>
  );
}

export function GeneralAcademicSource({ pack }: { pack: StudentGeneralAcademicPack }) {
  return (
    <article className="min-w-0 space-y-6" aria-label="Academic source">
      <header><p className="text-xs font-semibold uppercase tracking-wide text-primary">Academic source</p><h2 className="mt-1 text-2xl font-semibold">{pack.title}</h2><p className="mt-1 text-sm text-muted-foreground">{pack.topic}</p></header>
      <div className="whitespace-pre-wrap text-sm leading-7 sm:text-base">{pack.stimulus.text}</div>
      {pack.stimulus.formulas.length ? <section aria-labelledby="source-formulas" className="space-y-3"><h3 className="text-lg font-semibold" id="source-formulas">Formulas</h3>{pack.stimulus.formulas.map((formula) => <FormulaCard formula={formula} key={formula.id} />)}</section> : null}
      {pack.stimulus.tables.length ? <section aria-labelledby="source-tables" className="space-y-4"><h3 className="text-lg font-semibold" id="source-tables">Tables</h3>{pack.stimulus.tables.map((table) => <div className="max-w-full overflow-x-auto rounded-lg border border-workspace-border" key={table.id}><table className="w-full min-w-[520px] border-collapse text-left text-sm"><caption className="p-3 text-left font-semibold">{table.title || "Source data"}</caption><thead className="bg-surface-container"><tr>{table.columns.map((column) => <th className="border-t border-workspace-border px-3 py-2" key={column} scope="col">{column}</th>)}</tr></thead><tbody>{table.rows.map((row, rowIndex) => <tr className="border-t border-workspace-separator" key={`${table.id}-${rowIndex}`}>{row.map((cell, cellIndex) => <td className="px-3 py-2 tabular-nums" key={`${table.id}-${rowIndex}-${cellIndex}`}>{String(cell ?? "—")}</td>)}</tr>)}</tbody></table></div>)}</section> : null}
      {pack.stimulus.graphs.length ? <section aria-labelledby="source-graphs" className="space-y-4"><h3 className="text-lg font-semibold" id="source-graphs">Graphs</h3>{pack.stimulus.graphs.map((graph) => <StructuredGraph graph={graph} key={graph.id} />)}</section> : null}
      {pack.stimulus.figures.length ? <section aria-labelledby="source-figures" className="space-y-4"><h3 className="text-lg font-semibold" id="source-figures">Figures</h3>{pack.stimulus.figures.map((figure) => <figure className="rounded-lg border border-workspace-border bg-surface-container p-4" key={figure.id}><figcaption className="font-semibold">{figure.title || "Structured diagram"}</figcaption><p className="mt-2 text-sm leading-6">{figure.description}</p><p className="mt-2 text-xs text-muted-foreground">This bounded diagram is provided as an accessible description.</p></figure>)}</section> : null}
    </article>
  );
}
