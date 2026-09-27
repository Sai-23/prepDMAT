import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  isServerTimingEnabled,
  profileServerOperation,
  serializedByteSize,
} from "./server-timing";

describe("safe server timing", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("fails closed in production unless explicitly enabled", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("PERFORMANCE_TIMING_ENABLED", "");
    expect(isServerTimingEnabled()).toBe(false);
    vi.stubEnv("PERFORMANCE_TIMING_ENABLED", "true");
    expect(isServerTimingEnabled()).toBe(true);
  });

  it("logs only structured timing names, durations, counts and payload size", async () => {
    vi.stubEnv("PERFORMANCE_TIMING_ENABLED", "true");
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    await profileServerOperation("practice.submit_answer", async (trace) => {
      trace.metric("row_count", 1);
      await trace.measure("rpc", async () => undefined);
      return { saved: true };
    });
    const serializedLog = JSON.stringify(info.mock.calls);
    expect(serializedLog).toContain("practice.submit_answer");
    expect(serializedLog).toContain("response_bytes");
    expect(serializedLog).toContain("serialization");
    expect(serializedLog).not.toMatch(/token|password|answer_contents|user_id|email/i);
  });

  it("measures serialized bytes without returning payload content", () => {
    expect(serializedByteSize({ saved: true })).toBeGreaterThan(0);
    expect(serializedByteSize(undefined)).toBe(0);
  });
});
