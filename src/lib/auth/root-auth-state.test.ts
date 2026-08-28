import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  createServerClient: vi.fn(),
}));

vi.mock("@/lib/auth/guards", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: mocks.createServerClient,
}));

import { resolveRootAuthState } from "./root-auth-state";

function serverClient({
  profile,
  roles,
}: {
  profile: Record<string, unknown> | null;
  roles: Array<{ role: string }>;
}) {
  return {
    from: vi.fn((table: string) => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => table === "profiles"
          ? { maybeSingle: vi.fn(async () => ({ data: profile, error: null })) }
          : Promise.resolve({ data: roles, error: null })),
      })),
    })),
  };
}

describe("root server auth state", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders anonymous navigation from an unauthenticated server result", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);

    await expect(resolveRootAuthState()).resolves.toEqual({
      account: null,
      diagnosticStatus: null,
      theme: "system",
    });
    expect(mocks.createServerClient).not.toHaveBeenCalled();
  });

  it("resolves authenticated header identity, roles, and theme from one server user", async () => {
    mocks.getCurrentUser.mockResolvedValue({
      id: "user-1",
      email: "sai@example.com",
      user_metadata: { display_name: "Metadata Sai" },
    });
    mocks.createServerClient.mockResolvedValue(serverClient({
      profile: {
        display_name: "Sai",
        full_name: "Sai Kumar",
        theme_preference: "dark",
      },
      roles: [{ role: "admin" }],
    }));

    await expect(resolveRootAuthState()).resolves.toEqual({
      account: {
        userId: "user-1",
        displayName: "Sai",
        workspace: "admin",
      },
      diagnosticStatus: null,
      theme: "dark",
    });
  });

  it("does not render an authenticated user as logged out when profile lookup fails", async () => {
    mocks.getCurrentUser.mockResolvedValue({
      id: "user-1",
      email: "sai@example.com",
      user_metadata: { display_name: "Sai" },
    });
    mocks.createServerClient.mockRejectedValue(new Error("profile unavailable"));

    await expect(resolveRootAuthState()).resolves.toEqual({
      account: {
        userId: "user-1",
        displayName: "Sai",
        workspace: null,
      },
      diagnosticStatus: null,
      theme: "system",
    });
  });
});
