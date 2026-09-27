import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("site header asset loading", () => {
  it("does not preload all mutually exclusive responsive and theme logos", () => {
    const header = readFileSync(
      resolve(process.cwd(), "src/components/layout/site-header.tsx"),
      "utf8",
    );

    expect(header).not.toMatch(/\bpriority\b/);
    expect(header).toContain('sizes="40px"');
    expect(header.match(/sizes="\(min-width: 1280px\) 220px, 180px"/g)).toHaveLength(2);
  });
});
