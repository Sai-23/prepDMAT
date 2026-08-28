import { describe, expect, it } from "vitest";

import { bookmarkMutationSchema, mistakeEntrySchema } from "./schemas";

describe("learning review validation", () => {
  const questionId = "10000000-0000-4000-8000-000000000001";

  it("accepts a bookmark toggle", () => {
    expect(
      bookmarkMutationSchema.safeParse({ questionId, bookmarked: true }).success,
    ).toBe(true);
  });

  it("limits mistake notes", () => {
    expect(
      mistakeEntrySchema.safeParse({
        sourceKind: "practice_session_item",
        sourceId: questionId,
        note: "x".repeat(2001),
        isUnderstood: false,
      }).success,
    ).toBe(false);
  });
});
