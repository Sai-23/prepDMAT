import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("student result and empty-state next actions", () => {
  it("gives focused mock results useful review, Practice, and Mock Test paths", () => {
    const analysis = source("src/components/results/mock-analysis-view.tsx");

    expect(analysis).toContain("Choose your next Core activity");
    expect(analysis).toContain('<Link href="/practice">Start practice</Link>');
    expect(analysis).toContain('<Link href="/tests">Choose another mock</Link>');
    expect(analysis.indexOf("Choose your next Core activity")).toBeLessThan(
      analysis.indexOf('title="Question review"'),
    );
  });

  it("describes Results as mock history and makes empty libraries actionable", () => {
    const results = source("src/app/results/page.tsx");
    const mistakes = source("src/app/mistakes/page.tsx");
    const bookmarks = source("src/app/bookmarks/page.tsx");

    expect(results).toContain("No completed mocks yet");
    expect(results).toContain("Browse mock tests");
    expect(results).not.toContain("Complete a practice session or mock test");
    expect(mistakes).toContain('href="/practice"');
    expect(bookmarks).toContain('href="/tests"');
  });
});
