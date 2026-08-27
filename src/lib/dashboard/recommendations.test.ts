import { describe, expect, it } from "vitest";

import { daysUntil, formatStudyTime } from "./recommendations";

describe("dashboard formatting", () => {
  it("formats study duration compactly", () => {
    expect(formatStudyTime(45)).toBe("45s");
    expect(formatStudyTime(3_900)).toBe("1h 5m");
  });

  it("never returns a negative exam countdown", () => {
    expect(daysUntil("2026-08-01", new Date("2026-08-05T10:00:00"))).toBe(0);
    expect(daysUntil("2026-08-10", new Date("2026-08-05T10:00:00"))).toBe(5);
  });
});
