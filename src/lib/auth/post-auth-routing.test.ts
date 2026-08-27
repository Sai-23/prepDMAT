import { describe, expect, it } from "vitest";

import { decidePostAuthRoute } from "./post-auth-routing";

describe("post-auth routing", () => {
  it.each([
    ["email", "/onboarding"],
    ["google", "/onboarding"],
    ["phone", "/onboarding"],
  ])("sends a first-time %s user through the shared onboarding", (_provider, expected) => {
    expect(decidePostAuthRoute({
      onboardingCompletedAt: null,
      diagnosticStatus: "not_started",
      diagnosticSessionId: null,
    })).toBe(expected);
  });

  it("resumes an active initial diagnostic before the dashboard", () => {
    expect(decidePostAuthRoute({
      onboardingCompletedAt: null,
      diagnosticStatus: "in_progress",
      diagnosticSessionId: "diagnostic-session",
    })).toBe("/onboarding/diagnostic");
  });

  it.each(["email", "google", "phone"])("sends a returning %s user to the dashboard", () => {
    expect(decidePostAuthRoute({
      onboardingCompletedAt: "2026-08-25T00:00:00.000Z",
      diagnosticStatus: "completed",
      diagnosticSessionId: "diagnostic-session",
    })).toBe("/dashboard");
  });
});
