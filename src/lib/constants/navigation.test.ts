import { describe, expect, it } from "vitest";

import {
  adminNavigation,
  navigationForRoles,
  primaryNavigation,
  reviewerNavigation,
  diagnosticNavigationItem,
} from "./navigation";

describe("navigationForRoles", () => {
  it("shows reviewers only the shared console and review features", () => {
    expect(
      navigationForRoles(reviewerNavigation, ["reviewer"]).map(
        (item) => item.label,
      ),
    ).toEqual(["Reviewer Dashboard", "Review Queue"]);
  });

  it("shows admins every administration feature", () => {
    expect(navigationForRoles(adminNavigation, ["admin"])).toEqual(
      adminNavigation,
    );
  });

  it("contains no retired subject-module Admin navigation", () => {
    const navigation = JSON.stringify(adminNavigation).toLowerCase();
    expect(navigation).not.toContain("computer_science");
    expect(navigation).not.toContain("computer science");
    expect(navigation).not.toContain("testlet");
    expect(navigation).not.toContain("provider");
    expect(navigation).not.toContain("critic");
  });

  it("does not expose role-restricted administration links to students", () => {
    expect(navigationForRoles(adminNavigation, ["student"])).toEqual([]);
  });

  it("keeps the launch-stage public navigation free of pricing links", () => {
    expect(primaryNavigation.map((item) => item.label)).toEqual([
      "Dashboard",
      "Practice",
      "Mock Tests",
      "Progress",
      "Exam Format",
      "Free Diagnostic",
    ]);
    expect(primaryNavigation.map((item) => item.href)).not.toContain("/pricing");
  });

  it("maps every authoritative diagnostic state to an honest destination", () => {
    expect(diagnosticNavigationItem("not_started")).toMatchObject({ href: "/onboarding", label: "Free Diagnostic" });
    expect(diagnosticNavigationItem("in_progress")).toMatchObject({ href: "/onboarding/diagnostic", label: "Resume Diagnostic" });
    expect(diagnosticNavigationItem("completed")).toMatchObject({ href: "/onboarding/diagnostic/summary", label: "Diagnostic Complete ✓" });
  });
});
