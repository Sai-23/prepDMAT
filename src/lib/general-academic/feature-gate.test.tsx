import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ env: vi.fn(), notFound: vi.fn(() => { throw new Error("NOT_FOUND"); }) }));
vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({ notFound: mocks.notFound }));
vi.mock("@/lib/validators/env", () => ({ getEnv: mocks.env }));

import GeneralAcademicPracticeLayout from "@/app/practice/general-academic/layout";
import GeneralAcademicMockLayout from "@/app/mock/general-academic/layout";
import GeneralAcademicProgressLayout from "@/app/progress/general-academic/layout";
import { isGeneralAcademicEnabled } from "./feature-gate";

describe("General Academic production gate", () => {
  it.each([
    [false, false],
    [true, false],
    [false, true],
  ])("blocks every student route tree unless both flags are true (%s/%s)", (server, browser) => {
    mocks.env.mockReturnValue({ GENERAL_ACADEMIC_ENABLED: server, NEXT_PUBLIC_GENERAL_ACADEMIC_ENABLED: browser });
    expect(isGeneralAcademicEnabled()).toBe(false);
    for (const Layout of [GeneralAcademicPracticeLayout, GeneralAcademicMockLayout, GeneralAcademicProgressLayout]) {
      expect(() => Layout({ children: "hidden" })).toThrow("NOT_FOUND");
    }
  });

  it("allows all three student route trees when deliberately enabled", () => {
    mocks.env.mockReturnValue({ GENERAL_ACADEMIC_ENABLED: true, NEXT_PUBLIC_GENERAL_ACADEMIC_ENABLED: true });
    expect(isGeneralAcademicEnabled()).toBe(true);
    for (const Layout of [GeneralAcademicPracticeLayout, GeneralAcademicMockLayout, GeneralAcademicProgressLayout]) {
      expect(Layout({ children: "available" })).toBe("available");
    }
  });
});
