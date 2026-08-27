import { describe, expect, it } from "vitest";

import { generatePracticeManifest, practiceDifficultyOrder, practiceDurationSeconds } from "./generation";

describe("practice session generation", () => {
  it("creates deterministic, balanced mixed difficulty orders", () => {
    const first = practiceDifficultyOrder("mixed", 20, "practice-order");
    expect(first).toEqual(practiceDifficultyOrder("mixed", 20, "practice-order"));
    expect(first.filter((value) => value === "easy")).toHaveLength(7);
    expect(first.filter((value) => value === "medium")).toHaveLength(7);
    expect(first.filter((value) => value === "hard")).toHaveLength(6);
  });

  it.each(["figure_sequence", "mathematical_equation", "latin_square"] as const)("generates validated, unique %s snapshots", (module) => {
    let id = 0;
    const items = generatePracticeManifest({ module, difficulty: "easy", questionCount: 5, masterSeed: `practice-${module}`, createId: () => `00000000-0000-4000-8000-${String(++id).padStart(12, "0")}` });
    expect(items).toHaveLength(5);
    expect(new Set(items.map((item) => item.fingerprint))).toHaveLength(5);
    expect(items.every((item) => item.question_type === module && item.private_snapshot && item.public_snapshot)).toBe(true);
    expect(JSON.stringify(items.map((item) => item.public_snapshot))).not.toContain("correctAnswer");
    expect(JSON.stringify(items.map((item) => item.private_snapshot))).toContain("correctAnswer");
    expect(items.every((item) => item.reasoning_family.length > 0)).toBe(true);
    if (module !== "latin_square") {
      expect(items.slice(1).every((item, index) => item.reasoning_family !== items[index].reasoning_family)).toBe(true);
    }
  }, 30_000);

  it("uses the shared 25-minute protocol duration for official-size timed practice", () => {
    expect(practiceDurationSeconds("latin_square", 20, "timed", [])).toBe(25 * 60);
    expect(practiceDurationSeconds("latin_square", 20, "untimed", [])).toBeNull();
  });
});
