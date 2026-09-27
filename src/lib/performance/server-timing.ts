import "server-only";

type TimingOutcome = "success" | "error";

type StructuredTimingEvent = {
  type: "server_timing";
  operation: string;
  outcome: TimingOutcome;
  totalMs: number;
  stages: Record<string, number>;
  metrics: Record<string, number>;
};

function rounded(value: number) {
  return Number(value.toFixed(2));
}

export function isServerTimingEnabled() {
  const configured = process.env.PERFORMANCE_TIMING_ENABLED;
  if (configured !== undefined) return configured === "true";
  return process.env.NODE_ENV === "development";
}

export function serializedByteSize(value: unknown) {
  try {
    return new TextEncoder().encode(JSON.stringify(value)).byteLength;
  } catch {
    return 0;
  }
}

export class ServerTimingTrace {
  readonly #enabled: boolean;
  readonly #operation: string;
  readonly #startedAt = performance.now();
  readonly #stages = new Map<string, number>();
  readonly #metrics = new Map<string, number>();
  #finished = false;

  constructor(operation: string, enabled = isServerTimingEnabled()) {
    this.#operation = operation;
    this.#enabled = enabled;
  }

  async measure<T>(stage: string, task: () => PromiseLike<T> | T): Promise<T> {
    if (!this.#enabled) return await task();
    const startedAt = performance.now();
    try {
      return await task();
    } finally {
      const elapsed = performance.now() - startedAt;
      this.#stages.set(stage, (this.#stages.get(stage) ?? 0) + elapsed);
    }
  }

  metric(name: string, value: number) {
    if (this.#enabled && Number.isFinite(value)) this.#metrics.set(name, value);
  }

  responseSize(value: unknown) {
    if (!this.#enabled) return;
    const startedAt = performance.now();
    this.metric("response_bytes", serializedByteSize(value));
    const elapsed = performance.now() - startedAt;
    this.#stages.set("serialization", (this.#stages.get("serialization") ?? 0) + elapsed);
  }

  finish(outcome: TimingOutcome) {
    if (!this.#enabled || this.#finished) return;
    this.#finished = true;
    const event: StructuredTimingEvent = {
      type: "server_timing",
      operation: this.#operation,
      outcome,
      totalMs: rounded(performance.now() - this.#startedAt),
      stages: Object.fromEntries(
        [...this.#stages].map(([stage, duration]) => [stage, rounded(duration)]),
      ),
      metrics: Object.fromEntries(
        [...this.#metrics].map(([name, value]) => [name, rounded(value)]),
      ),
    };
    console.info("[performance]", JSON.stringify(event));
  }
}

export async function profileServerOperation<T>(
  operation: string,
  task: (trace: ServerTimingTrace) => Promise<T>,
) {
  const trace = new ServerTimingTrace(operation);
  try {
    const result = await task(trace);
    trace.responseSize(result);
    trace.finish("success");
    return result;
  } catch (error) {
    trace.finish("error");
    throw error;
  }
}
