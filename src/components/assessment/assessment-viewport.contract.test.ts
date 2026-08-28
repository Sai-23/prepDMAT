import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("focused assessment viewport contract", () => {
  const layout = source("src/app/layout.tsx");
  const styles = source("src/app/globals.css");
  const shell = source("src/components/assessment/assessment-shell.tsx");
  const workspace = source("src/components/layout/workspace-shell.tsx");
  const figure = source("src/components/questions/figure-sequence-renderer.tsx");

  it("builds a continuous viewport-bounded flex chain with body scrolling disabled", () => {
    expect(layout).toContain("data-app-frame");
    expect(layout).toContain("data-site-main");
    expect(styles).toContain("height: 100dvh");
    expect(styles).toContain("body:has([data-focused-assessment])");
    expect(styles).toContain("overflow: hidden");
    expect(shell).toContain("flex h-full min-h-0");
  });

  it("leaves exactly the question content as the primary vertical scroll region", () => {
    expect(shell).toContain("data-assessment-scroll-region");
    expect(shell).toContain("min-h-0 flex-1 overflow-y-auto");
    expect(shell).toContain("data-assessment-action-zone");
    expect(shell).toContain("shrink-0 border-t");
  });

  it("hides the workspace sidebar only while an assessment is active", () => {
    expect(workspace).toContain("data-workspace-sidebar");
    expect(styles).toContain("[data-workspace-shell]:has([data-focused-assessment]) [data-workspace-sidebar]");
  });

  it("isolates narrow-screen horizontal scrolling to a responsive sequence strip", () => {
    expect(figure).toContain("data-figure-sequence-strip");
    expect(figure).toContain("max-w-full overflow-x-auto");
    expect(figure).toContain("clamp(6.5rem,10.5vw,9rem)");
  });

  it("uses non-color selected indicators without changing border width", () => {
    expect(figure).toContain('role="radiogroup"');
    expect(figure).toContain("aria-checked={isSelected}");
    expect(figure).toContain("Selected");
    expect(figure).toContain("border-2");
  });
});
