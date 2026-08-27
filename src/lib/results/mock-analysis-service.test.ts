import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("mock-analysis server contracts", () => {
  it("delegates attempt access through the ownership-scoped result reader", () => {
    const service = source("src/lib/results/mock-analysis-data.ts");
    expect(service).toContain("getAttemptResult(userId, attemptId)");
    expect(service).not.toMatch(/client.*userId/i);
  });

  it("ownership-checks completed source mocks before bulk-loading practice exclusions", () => {
    const context = source("src/lib/results/mock-practice-context.ts");
    expect(context).toContain('.eq("user_id", userId)');
    expect(context).toContain('.in("status", ["submitted", "auto_submitted"])');
    expect(context).toContain('.from("practice_attempt_items")');
    expect(context).toContain('.eq("attempt_id", attempt.id)');
    expect(context.match(/\.from\(/g)).toHaveLength(2);
    const practice = source("src/lib/practice/data.ts");
    expect(practice).toContain("...sourceContext.fingerprints");
    expect(practice).toContain("...sourceContext.structuralProfiles");
  });
});
