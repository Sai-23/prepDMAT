import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const page = readFileSync(resolve(process.cwd(), "src/app/practice/page.tsx"), "utf8");
const data = readFileSync(resolve(process.cwd(), "src/lib/practice/data.ts"), "utf8");

describe("practice start routing", () => {
  it("resumes an active diagnostic instead of attempting a conflicting session", () => {
    expect(page).toContain("getOnboardingState(user.id)");
    expect(page).toContain('diagnosticStatus === "in_progress"');
    expect(page).toContain('redirect("/onboarding/diagnostic")');
  });

  it("retains the single-active-session guard with an actionable public error", () => {
    expect(data).toContain("active_practice_session_exists");
    expect(data).toContain("Finish or leave your active Practice or Diagnostic session");
  });
});
