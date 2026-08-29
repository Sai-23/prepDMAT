import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { createDiagnosticSubmissionGuard } from "./diagnostic-navigation";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("diagnostic continuation performance contract", () => {
  it("allows only one submission until the active operation releases", () => {
    const guard = createDiagnosticSubmissionGuard();
    expect(guard.acquire()).toBe(true);
    expect(guard.acquire()).toBe(false);
    guard.release();
    expect(guard.acquire()).toBe(true);
  });

  it("uses one server action for save and server-confirmed continuation", () => {
    const component = source("src/components/onboarding/diagnostic-experience.tsx");
    const actions = source("src/app/onboarding/actions.ts");

    expect(component).toContain("await continueQuestion({");
    expect(component).toContain("continueDiagnosticAction");
    expect(component).toContain("continuePublicDiagnosticAction");
    expect(component).not.toContain("submitDiagnosticAnswerAction");
    expect(component).not.toContain("nextDiagnosticQuestionAction");
    expect(component).not.toContain("completeDiagnosticAction");
    expect(actions).toContain("continueInitialDiagnostic(user.id, parsed.data)");
  });

  it("keeps save before advance or completion and makes lost replies retry-safe", () => {
    const data = source("src/lib/onboarding/data.ts");
    const save = data.indexOf("await recordDiagnosticAnswer(userId, input)");
    const complete = data.indexOf("await completeVerifiedDiagnostic(userId, input.sessionId)");
    const advance = data.indexOf("session: await advanceVerifiedDiagnosticQuestion(userId, input.sessionId)");

    expect(save).toBeGreaterThan(-1);
    expect(complete).toBeGreaterThan(save);
    expect(advance).toBeGreaterThan(save);
    expect(data).toContain("current?.question.id !== input.questionId");
    expect(data).toContain("currentPosition === questionCount");
  });
});
