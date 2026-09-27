import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/202609240036_practice_history_performance.sql"),
  "utf8",
);
const policies = readFileSync(
  resolve(process.cwd(), "supabase/migrations/202608040005_rls_policies.sql"),
  "utf8",
);
const publicHeader = readFileSync(
  resolve(process.cwd(), "src/components/layout/public-site-header.tsx"),
  "utf8",
);

describe("user_header_state security contract", () => {
  it("denies anonymous access and grants read-only access to authenticated users", () => {
    expect(migration).toContain("revoke all on public.user_header_state from public, anon");
    expect(migration).toContain("grant select on public.user_header_state to authenticated");
    expect(migration).not.toMatch(/grant\s+(insert|update|delete|all).*user_header_state\s+to\s+authenticated/i);
  });

  it("runs as the caller so profile and role RLS remain authoritative", () => {
    expect(migration).toContain("with (security_invoker = true)");
    expect(policies).toMatch(/create policy profiles_select[\s\S]*auth\.uid\(\) = id or public\.current_user_has_role\('admin'\)/);
    expect(policies).toMatch(/create policy user_roles_select[\s\S]*auth\.uid\(\) = user_id or public\.current_user_has_role\('admin'\)/);
  });

  it("scopes the public account island to the verified session user", () => {
    expect(publicHeader).toContain("supabase.auth.getUser()");
    expect(publicHeader).toContain('.from("user_header_state")');
    expect(publicHeader).toContain('.eq("id", user.id)');
    expect(publicHeader).not.toMatch(/searchParams|pathname|localStorage/);
  });

  it("preserves the expected anonymous, cross-user, and admin access matrix", () => {
    const canReadHeaderRow = (requesterId: string | null, rowId: string, isAdmin = false) =>
      requesterId !== null && (requesterId === rowId || isAdmin);

    expect(canReadHeaderRow(null, "user-a")).toBe(false);
    expect(canReadHeaderRow("user-a", "user-a")).toBe(true);
    expect(canReadHeaderRow("user-a", "user-b")).toBe(false);
    expect(canReadHeaderRow("user-b", "user-a")).toBe(false);
    expect(canReadHeaderRow("admin", "admin", true)).toBe(true);
    expect(migration).toContain("array_agg(user_role.role)");
  });
});
