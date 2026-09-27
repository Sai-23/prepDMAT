import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";

const PERFORMANCE_MARKER = "[performance]";
const WRAPPER_STAGES = new Set(["parallel_data_queries", "session_creation"]);

function usage() {
  return [
    "Usage: npm run analyze:performance -- <vercel-log-file> [more-log-files] [--json]",
    "       Get-Content <vercel-log-file> | npm run analyze:performance -- --json",
    "",
    "Only successful server_timing events are included in latency percentiles.",
    "Raw log messages and arbitrary metadata are never emitted.",
  ].join("\n");
}

function extractEvent(line) {
  const markerIndex = line.indexOf(PERFORMANCE_MARKER);
  if (markerIndex >= 0) {
    const payload = line.slice(markerIndex + PERFORMANCE_MARKER.length).trim();
    try {
      return JSON.parse(payload);
    } catch {
      return null;
    }
  }

  try {
    const outer = JSON.parse(line);
    for (const key of ["message", "msg", "text"]) {
      if (typeof outer?.[key] === "string") {
        const nested = extractEvent(outer[key]);
        if (nested) return nested;
      }
    }
  } catch {
    // Exported platform logs are not guaranteed to be JSON lines.
  }
  return null;
}

function isTimingEvent(value) {
  return value
    && value.type === "server_timing"
    && typeof value.operation === "string"
    && (value.outcome === "success" || value.outcome === "error")
    && Number.isFinite(value.totalMs)
    && value.stages && typeof value.stages === "object"
    && value.metrics && typeof value.metrics === "object";
}

function operationName(event) {
  if (event.operation !== "mock.start_or_resume") return event.operation;
  if (event.metrics.resumed === 1) return "mock.resume";
  if (event.metrics.resumed === 0) return "mock.start";
  return event.operation;
}

function percentile(sortedValues, percentileValue) {
  if (!sortedValues.length) return null;
  if (sortedValues.length === 1) return sortedValues[0];
  const position = (sortedValues.length - 1) * percentileValue;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  const weight = position - lower;
  return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
}

function rounded(value) {
  return value === null ? null : Number(value.toFixed(2));
}

function stats(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const total = sorted.reduce((sum, value) => sum + value, 0);
  return {
    count: sorted.length,
    min: rounded(sorted[0] ?? null),
    max: rounded(sorted.at(-1) ?? null),
    p50: rounded(percentile(sorted, 0.5)),
    p75: rounded(percentile(sorted, 0.75)),
    p95: rounded(percentile(sorted, 0.95)),
    average: rounded(sorted.length ? total / sorted.length : null),
  };
}

function stageCategory(stage) {
  if (stage === "serialization") return "serialization";
  if (/auth/i.test(stage)) return "auth";
  if (/rate[_-]?limit/i.test(stage)) return "rate_limit";
  if (/grading/i.test(stage)) return "grading";
  if (/snapshot_creation|manifest_generation/i.test(stage)) return "snapshot";
  if (/rpc/i.test(stage)) return "rpc";
  if (/query|lookup|reload|payload|metadata_access|cursor_update/i.test(stage)) return "query";
  return "other";
}

function aggregate(events, rejectedLines) {
  const operations = new Map();
  let errorCount = 0;
  for (const event of events) {
    const name = operationName(event);
    const operation = operations.get(name) ?? {
      totals: [], responseBytes: [], stages: new Map(), categories: new Map(), errors: 0,
    };
    operations.set(name, operation);
    if (event.outcome === "error") {
      operation.errors += 1;
      errorCount += 1;
      continue;
    }

    operation.totals.push(Number(event.totalMs));
    if (Number.isFinite(event.metrics.response_bytes)) operation.responseBytes.push(Number(event.metrics.response_bytes));

    let categorizedDuration = 0;
    for (const [stage, rawDuration] of Object.entries(event.stages)) {
      const duration = Number(rawDuration);
      if (!Number.isFinite(duration)) continue;
      const values = operation.stages.get(stage) ?? [];
      values.push(duration);
      operation.stages.set(stage, values);
      if (WRAPPER_STAGES.has(stage)) continue;
      const category = stageCategory(stage);
      const categories = operation.categories.get(category) ?? [];
      categories.push(duration);
      operation.categories.set(category, categories);
      categorizedDuration += duration;
    }
    const otherDuration = Math.max(0, Number(event.totalMs) - categorizedDuration);
    const other = operation.categories.get("unmeasured_server_work") ?? [];
    other.push(otherDuration);
    operation.categories.set("unmeasured_server_work", other);
  }

  const result = [...operations.entries()].map(([operation, values]) => {
    const totalStats = stats(values.totals);
    const stageStats = Object.fromEntries([...values.stages.entries()]
      .sort(([first], [second]) => first.localeCompare(second))
      .map(([stage, durations]) => [stage, stats(durations)]));
    const categoryAverages = Object.fromEntries([...values.categories.entries()].map(([category, durations]) => [
      category,
      rounded(durations.reduce((sum, value) => sum + value, 0) / Math.max(values.totals.length, 1)),
    ]));
    const dominantStage = Object.entries(categoryAverages)
      .sort(([, first], [, second]) => Number(second) - Number(first))[0]?.[0] ?? null;
    return {
      operation,
      ...totalStats,
      errors: values.errors,
      responseBytes: stats(values.responseBytes),
      dominantStage,
      observedImpactMs: rounded((totalStats.average ?? 0) * totalStats.count),
      categoryAverageMs: categoryAverages,
      stages: stageStats,
    };
  }).sort((first, second) => second.observedImpactMs - first.observedImpactMs);

  return {
    generatedAt: new Date().toISOString(),
    validEvents: events.length,
    successfulEvents: events.length - errorCount,
    errorEvents: errorCount,
    rejectedLines,
    percentileMethod: "linear interpolation between closest ranks",
    frequencyMeaning: "observed successful event count in the supplied log window",
    operations: result,
  };
}

function markdown(report) {
  const lines = [
    "# Performance timing aggregate", "",
    `Valid events: ${report.validEvents}; successful: ${report.successfulEvents}; errors: ${report.errorEvents}; rejected timing lines: ${report.rejectedLines}.`, "",
    "| Operation | Samples | Min | P50 | P75 | P95 | Max | Average | Dominant stage | Observed impact | Avg response bytes |",
    "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | ---: | ---: |",
  ];
  for (const row of report.operations) {
    lines.push(`| ${row.operation} | ${row.count} | ${row.min ?? "-"} | ${row.p50 ?? "-"} | ${row.p75 ?? "-"} | ${row.p95 ?? "-"} | ${row.max ?? "-"} | ${row.average ?? "-"} | ${row.dominantStage ?? "-"} | ${row.observedImpactMs} | ${row.responseBytes.average ?? "-"} |`);
  }
  lines.push("", "Observed impact is sample count × average latency for the supplied log window; it is not a production-wide traffic estimate.");
  for (const row of report.operations) {
    lines.push("", `## ${row.operation}`, "", "### Stage statistics", "", "| Stage | Samples | P50 | P75 | P95 | Average |", "| --- | ---: | ---: | ---: | ---: | ---: |");
    for (const [stage, stageStats] of Object.entries(row.stages)) {
      lines.push(`| ${stage} | ${stageStats.count} | ${stageStats.p50} | ${stageStats.p75} | ${stageStats.p95} | ${stageStats.average} |`);
    }
    lines.push("", "### Average categorized time", "");
    for (const [category, duration] of Object.entries(row.categoryAverageMs)) {
      const percentage = row.average ? rounded((Number(duration) / row.average) * 100) : 0;
      lines.push(`- ${category}: ${duration} ms (${percentage}%)`);
    }
  }
  return lines.join("\n");
}

async function readLines(stream, events) {
  let rejectedLines = 0;
  const lines = createInterface({ input: stream, crlfDelay: Infinity });
  for await (const line of lines) {
    if (!line.includes(PERFORMANCE_MARKER) && !line.includes("server_timing")) continue;
    const event = extractEvent(line);
    if (isTimingEvent(event)) events.push(event);
    else rejectedLines += 1;
  }
  return rejectedLines;
}

const args = process.argv.slice(2);
const json = args.includes("--json");
const help = args.includes("--help") || args.includes("-h");
const paths = args.filter((argument) => !argument.startsWith("--"));
if (help) {
  console.log(usage());
  process.exit(0);
}

const events = [];
let rejectedLines = 0;
if (paths.length) {
  for (const path of paths) rejectedLines += await readLines(createReadStream(path), events);
} else if (process.stdin.isTTY) {
  console.error(usage());
  process.exit(1);
} else {
  rejectedLines = await readLines(process.stdin, events);
}

if (!events.length) {
  console.error("No valid [performance] server_timing events were found.");
  process.exit(2);
}

const report = aggregate(events, rejectedLines);
console.log(json ? JSON.stringify(report, null, 2) : markdown(report));
