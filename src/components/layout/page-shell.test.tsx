import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const pageShell = readFileSync(resolve(process.cwd(), "src/components/layout/page-shell.tsx"), "utf8");
const workspaceShell = readFileSync(resolve(process.cwd(), "src/components/layout/workspace-shell.tsx"), "utf8");

describe("PageShell compact heading mode", () => {
  it("removes the heading row and its spacing when requested", () => {
    expect(pageShell).toContain("hideHeading ? undefined");
    expect(pageShell).toContain("compact={compact}");
    expect(workspaceShell).toContain("{heading ? (");
    expect(workspaceShell).toContain('compact ? "py-3" : "py-6"');
  });
});
