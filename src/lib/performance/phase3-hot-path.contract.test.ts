import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("Phase 3 hot-path performance contracts", () => {
  it("keeps safe opt-in timing on priority Practice and Mock operations", () => {
    const practiceActions = source("src/app/practice/actions.ts");
    const mockActions = source("src/app/tests/actions.ts");
    for (const operation of ["practice.start", "practice.submit_answer", "practice.next_question", "practice.complete"]) {
      expect(practiceActions).toContain(operation);
    }
    for (const operation of ["mock.start_or_resume", "mock.save_answer", "mock.section_transition", "mock.complete"]) {
      expect(mockActions).toContain(operation);
    }
  });

  it("uses only the immutable item read plus the authoritative secure RPC when saving a mock answer", () => {
    const data = source("src/lib/tests/data.ts");
    const saveBlock = data.split("export async function saveTestResponse")[1]
      .split("export async function gradeAndSubmitTest")[0];
    expect(saveBlock).toContain('.from("practice_attempt_items")');
    expect(saveBlock).toContain('admin.rpc("save_test_response_secure"');
    expect(saveBlock).not.toContain('.from("test_attempts")');
    expect(saveBlock).not.toContain('.from("user_responses")');

    const rpc = source("supabase/migrations/202608280026_mock_state_security.sql");
    expect(rpc).toMatch(/save_test_response_secure[\s\S]*where id = p_attempt_id and user_id = p_user_id[\s\S]*section_expires_at[\s\S]*test_question_not_active[\s\S]*test_response_unavailable/);
  });

  it("keeps timer ticks local and isolates timer rendering from the mock workspace", () => {
    const runner = source("src/components/tests/test-runner.tsx");
    const timerBlock = runner.split("const TestTimer")[1].split("export function TestRunner")[0];
    expect(timerBlock).toContain("window.setInterval(updateRemaining, 1000)");
    expect(timerBlock).not.toMatch(/Action\(|fetch\(|supabase/i);
    expect(runner).toContain("const TestTimer = memo");
  });
});
