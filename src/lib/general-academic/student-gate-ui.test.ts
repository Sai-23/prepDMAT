import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("student General Academic UI gate", () => {
  it("checks the gate before loading data in every student GAM page", () => {
    const roots = [
      "src/app/practice/general-academic",
      "src/app/mock/general-academic",
      "src/app/(authenticated)/progress/general-academic",
    ];
    const pages = roots.flatMap((rootPath) => {
      const root = resolve(process.cwd(), rootPath);
      const walk = (directory: string): string[] => readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        const path = resolve(directory, entry.name);
        return entry.isDirectory() ? walk(path) : entry.name === "page.tsx" ? [path] : [];
      });
      return walk(root);
    });
    expect(pages.length).toBe(14);
    for (const page of pages) {
      const content = readFileSync(page, "utf8");
      expect(content, page).toContain("requireGeneralAcademicEnabled();");
      expect(content.indexOf("requireGeneralAcademicEnabled();"), page).toBeGreaterThan(content.indexOf("const user = await requireUser();"));
    }
  });

  it.each([
    ["src/app/(authenticated)/dashboard/page.tsx", "generalAcademicEnabled ? <section"],
    ["src/app/(authenticated)/practice/page.tsx", "generalAcademicEnabled ? <section"],
    ["src/app/(authenticated)/tests/page.tsx", "generalAcademicEnabled ? <section"],
    ["src/app/(authenticated)/progress/page.tsx", "if (!isGeneralAcademicUiEnabled()) return null"],
  ])("keeps %s hidden through the server gate", (file, gate) => {
    expect(source(file)).toContain(gate);
    expect(source(file)).toContain("isGeneralAcademicUiEnabled");
  });

  it("keeps navigation Core-only and retains authorized admin tooling", () => {
    const navigation = source("src/lib/constants/navigation.ts");
    const student = navigation.split("export const studentNavigation")[1].split("export const adminNavigation")[0];
    expect(student).not.toContain("general-academic");
    expect(student).toContain('href: "/practice"');
    expect(student).toContain('href: "/tests"');
    expect(navigation.split("export const adminNavigation")[1]).toContain('href: "/admin/general-academic"');
  });
});
