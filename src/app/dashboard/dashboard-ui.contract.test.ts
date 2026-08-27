import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const page = readFileSync(resolve(process.cwd(), "src/app/dashboard/page.tsx"), "utf8");
const loading = readFileSync(resolve(process.cwd(), "src/app/dashboard/loading.tsx"), "utf8");
const globalStyles = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8");
const model = readFileSync(resolve(process.cwd(), "src/lib/dashboard/model.ts"), "utf8");

describe("Phase 10 dashboard responsive and accessible UI contract", () => {
  it("keeps the requested scan order in the server-rendered document", () => {
    const primary = page.indexOf("<ActionCard action={data.primaryAction}");
    const quick = page.indexOf('id="quick-actions"');
    const progress = page.indexOf('id="core-progress"');
    const activity = page.indexOf('id="recent-activity"');
    expect(primary).toBeGreaterThan(0);
    expect(primary).toBeLessThan(quick);
    expect(quick).toBeLessThan(progress);
    expect(progress).toBeLessThan(activity);
  });

  it("stacks primary content on mobile and adds columns progressively", () => {
    expect(page).toContain("flex flex-col gap-5 sm:flex-row");
    expect(page).toContain("grid gap-3 sm:grid-cols-2");
    expect(page).toContain("lg:grid-cols-3");
    expect(page).not.toContain("overflow-x-auto");
    expect(page).toContain("w-full shrink-0 sm:w-auto");
    expect(page).toContain("min-w-0");
  });

  it("uses semantic sections, heading IDs, descriptive links, and visible focus", () => {
    expect(page.match(/<section/g)?.length).toBeGreaterThanOrEqual(4);
    expect(page).toContain("aria-labelledby");
    expect(page).toContain("aria-live");
    expect(page).toContain("focus-visible:ring-2");
    expect(model).toContain("Resume Core Mock");
    expect(model).toContain("Start Core Practice");
  });

  it("uses theme tokens and honors reduced motion in stable skeletons", () => {
    expect(page).toContain("bg-surface-lowest");
    expect(page).toContain("border-workspace-border");
    expect(page).not.toMatch(/bg-(?:white|black|slate|blue|amber|emerald|red)-/);
    expect(loading).toContain("motion-reduce:animate-none");
    expect(loading.match(/animate-pulse/g)?.length).toBeGreaterThanOrEqual(5);
    expect(globalStyles).toContain("@media (prefers-reduced-motion: reduce)");
    expect(globalStyles).toContain(".dark");
  });

  it("renders meaningful zero and partial states without fake metrics", () => {
    expect(page).toContain("Prepare for the Core Module");
    expect(page).toContain("No completed activity yet");
    expect(page).toContain("Not enough data");
    expect(page).toContain("Core progress is temporarily unavailable");
    expect(page).not.toContain("0%");
  });
});
