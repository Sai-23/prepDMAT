import type { Route } from "next";

import { hasAnyRole } from "../auth/roles";
import type { UserRole } from "../../types/auth";

export type NavigationItem = {
  href: Route;
  label: string;
  requiresAuth?: boolean;
  roles?: UserRole[];
};

export type StudentDiagnosticStatus = "not_started" | "in_progress" | "completed" | "skipped";

export function diagnosticNavigationItem(status: StudentDiagnosticStatus | null): NavigationItem {
  if (status === "completed") {
    return { href: "/onboarding/diagnostic/summary", label: "Diagnostic Complete ✓", requiresAuth: true };
  }
  if (status === "in_progress") {
    return { href: "/onboarding/diagnostic", label: "Resume Diagnostic", requiresAuth: true };
  }
  return { href: "/diagnostic", label: "Free Diagnostic" };
}

export const primaryNavigation: NavigationItem[] = [
  { href: "/dashboard", label: "Dashboard", requiresAuth: true },
  { href: "/practice", label: "Practice", requiresAuth: true },
  { href: "/tests", label: "Mock Tests", requiresAuth: true },
  { href: "/progress" as Route, label: "Progress", requiresAuth: true },
  { href: "/exam-format", label: "Exam Format" },
  diagnosticNavigationItem(null),
];

export const studentNavigation: NavigationItem[] = [
  { href: "/dashboard", label: "Dashboard", requiresAuth: true },
  { href: "/practice", label: "Practice", requiresAuth: true },
  { href: "/tests", label: "Mock Tests", requiresAuth: true },
  { href: "/progress" as Route, label: "Progress", requiresAuth: true },
  { href: "/results", label: "Results", requiresAuth: true },
  { href: "/mistakes", label: "Mistake Notebook", requiresAuth: true },
  { href: "/bookmarks", label: "Bookmarks", requiresAuth: true },
];

export const adminNavigation: NavigationItem[] = [
  {
    href: "/admin",
    label: "Admin Dashboard",
    requiresAuth: true,
    roles: ["admin", "reviewer"],
  },
  {
    href: "/admin/generate" as Route,
    label: "Generate Questions",
    requiresAuth: true,
    roles: ["admin"],
  },
  {
    href: "/admin/figure-preview" as Route,
    label: "Figure Renderer",
    requiresAuth: true,
    roles: ["admin"],
  },
  {
    href: "/admin/questions/new",
    label: "Question Creator",
    requiresAuth: true,
    roles: ["admin"],
  },
  {
    href: "/admin/general-academic" as Route,
    label: "General Academic",
    requiresAuth: true,
    roles: ["admin"],
  },
  {
    href: "/admin/tests/new",
    label: "Mock Builder",
    requiresAuth: true,
    roles: ["admin"],
  },
  {
    href: "/admin/review",
    label: "Question Bank",
    requiresAuth: true,
    roles: ["admin", "reviewer"],
  },
];

export const reviewerNavigation: NavigationItem[] = [
  {
    href: "/admin",
    label: "Reviewer Dashboard",
    requiresAuth: true,
    roles: ["admin", "reviewer"],
  },
  {
    href: "/admin/review",
    label: "Review Queue",
    requiresAuth: true,
    roles: ["admin", "reviewer"],
  },
];

export function navigationForRoles(
  items: readonly NavigationItem[],
  roles: readonly UserRole[],
) {
  return items.filter(
    (item) => !item.roles?.length || hasAnyRole(roles, item.roles),
  );
}
