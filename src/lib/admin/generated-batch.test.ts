import { describe, expect, it, vi } from "vitest";

import { runGeneratedQuestionBatch } from "./generated-batch";

describe("generated-question batch publication", () => {
  it("keeps partial successes and returns a per-question result", async () => {
    const result = await runGeneratedQuestionBatch(
      [{ fingerprint: "q1" }, { fingerprint: "q2" }, { fingerprint: "q3" }],
      async (item) => item.fingerprint === "q2"
        ? { id: item.fingerprint, status: "failed", reason: "VALIDATION_FAILED" }
        : { id: item.fingerprint, status: "published", questionId: `id-${item.fingerprint}` },
    );

    expect(result).toMatchObject({ requested: 3, published: 2, failed: 1, alreadyPublished: 0 });
    expect(result.results).toEqual([
      { id: "q1", status: "published", questionId: "id-q1" },
      { id: "q2", status: "failed", reason: "VALIDATION_FAILED" },
      { id: "q3", status: "published", questionId: "id-q3" },
    ]);
  });

  it("treats an already-published question as safe and continues", async () => {
    const result = await runGeneratedQuestionBatch(
      [{ fingerprint: "q1" }, { fingerprint: "q2" }],
      async (item) => item.fingerprint === "q1"
        ? { id: "q1", status: "already_published", questionId: "existing" }
        : { id: "q2", status: "published", questionId: "new" },
    );
    expect(result).toMatchObject({ requested: 2, published: 1, alreadyPublished: 1, failed: 0 });
  });

  it("deduplicates fingerprints and invokes publication once", async () => {
    const publishOne = vi.fn(async (item: { fingerprint: string }) => ({ id: item.fingerprint, status: "published" as const, questionId: "saved" }));
    const result = await runGeneratedQuestionBatch(
      [{ fingerprint: "q1" }, { fingerprint: "q1" }],
      publishOne,
    );
    expect(publishOne).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ requested: 2, published: 1, skipped: 1 });
    expect(result.results[1]).toMatchObject({ id: "q1", status: "skipped", reason: "DUPLICATE_REQUEST" });
  });

  it("contains unexpected item failures without stopping the batch", async () => {
    const result = await runGeneratedQuestionBatch(
      [{ fingerprint: "q1" }, { fingerprint: "q2" }],
      async (item) => {
        if (item.fingerprint === "q1") throw new Error("database detail");
        return { id: "q2", status: "published", questionId: "saved" };
      },
    );
    expect(result.published).toBe(1);
    expect(result.failed).toBe(1);
    expect(result.results[0]).toMatchObject({ id: "q1", status: "failed", reason: "PUBLISH_FAILED" });
    expect(JSON.stringify(result)).not.toContain("database detail");
  });
});
