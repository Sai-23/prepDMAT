import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ notFound: vi.fn(() => { throw new Error("NOT_FOUND"); }) }));
vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({ notFound: mocks.notFound }));

import GeneralAcademicPracticeLayout from "@/app/practice/general-academic/layout";
import GeneralAcademicMockLayout from "@/app/mock/general-academic/layout";
import GeneralAcademicProgressLayout from "@/app/progress/general-academic/layout";
import { isGeneralAcademicEnabled, isGeneralAcademicUiEnabled } from "./feature-gate";

const layouts = [GeneralAcademicPracticeLayout, GeneralAcademicMockLayout, GeneralAcademicProgressLayout];

describe("General Academic production gate", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("fails closed when either feature flag is missing", () => {
    vi.stubEnv("GENERAL_ACADEMIC_ENABLED", undefined);
    vi.stubEnv("NEXT_PUBLIC_GENERAL_ACADEMIC_ENABLED", undefined);
    expect(isGeneralAcademicEnabled()).toBe(false);
    expect(isGeneralAcademicUiEnabled()).toBe(false);
  });

  it.each(["false", "TRUE", "1", "yes", " true "])("treats a non-exact server value %j as disabled", (value) => {
    vi.stubEnv("GENERAL_ACADEMIC_ENABLED", value);
    expect(isGeneralAcademicEnabled()).toBe(false);
  });

  it("uses only the server flag as the route and action security boundary", () => {
    vi.stubEnv("GENERAL_ACADEMIC_ENABLED", "false");
    vi.stubEnv("NEXT_PUBLIC_GENERAL_ACADEMIC_ENABLED", "true");
    for (const Layout of layouts) expect(() => Layout({ children: "hidden" })).toThrow("NOT_FOUND");

    vi.stubEnv("GENERAL_ACADEMIC_ENABLED", "true");
    vi.stubEnv("NEXT_PUBLIC_GENERAL_ACADEMIC_ENABLED", "false");
    for (const Layout of layouts) expect(Layout({ children: "available" })).toBe("available");
  });

  it("enables student UI only when both rollout flags are exactly true", () => {
    vi.stubEnv("GENERAL_ACADEMIC_ENABLED", "false");
    vi.stubEnv("NEXT_PUBLIC_GENERAL_ACADEMIC_ENABLED", "true");
    expect(isGeneralAcademicUiEnabled()).toBe(false);
    vi.stubEnv("GENERAL_ACADEMIC_ENABLED", "true");
    expect(isGeneralAcademicUiEnabled()).toBe(true);
    vi.stubEnv("NEXT_PUBLIC_GENERAL_ACADEMIC_ENABLED", "false");
    expect(isGeneralAcademicUiEnabled()).toBe(false);
  });
});
