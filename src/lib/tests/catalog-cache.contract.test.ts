import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("published mock catalog cache", () => {
  it("caches only shared published catalog data and keeps attempt summaries personalized", () => {
    const data = source("src/lib/tests/data.ts");

    expect(data).toContain('const getPublishedTestCatalogBase = unstable_cache(');
    expect(data).toContain('tags: ["published-core-test-catalog"]');
    expect(data).toContain('admin.rpc("get_curated_test_attempt_summaries"');
    expect(data.indexOf("getPublishedTestCatalogBase()")).toBeLessThan(
      data.indexOf('admin.rpc("get_curated_test_attempt_summaries"'),
    );
  });

  it("invalidates the shared catalog after mock publication changes", () => {
    const actions = source("src/app/admin/actions.ts");

    expect(actions.match(/revalidateTag\("published-core-test-catalog", "max"\)/g)).toHaveLength(2);
  });
});
