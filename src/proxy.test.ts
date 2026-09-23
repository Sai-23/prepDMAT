import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  createServerClient: vi.fn(),
  getUser: vi.fn(),
  roles: vi.fn(),
}));

vi.mock("@supabase/ssr", () => ({ createServerClient: mocks.createServerClient }));
vi.mock("@/lib/auth/config", () => ({
  getApplicationUrl: (path: string) => new URL(path, "https://prepdmat.in"),
}));

import { proxy } from "./proxy";

function request(path: string) {
  return new NextRequest(`https://prepdmat.in${path}`, {
    headers: { cookie: "sb-session=old-token" },
  });
}

function configureClient({ refresh, user }: { refresh: boolean; user: { id: string } | null }) {
  mocks.getUser.mockImplementation(async () => {
    if (refresh) {
      const cookies = mocks.createServerClient.mock.calls.at(-1)?.[2]?.cookies;
      cookies.setAll([{
        name: "sb-session",
        value: "new-token",
        options: { path: "/", sameSite: "lax", secure: true },
      }]);
    }
    return { data: { user }, error: null };
  });
  mocks.createServerClient.mockImplementation(() => ({
    auth: { getUser: mocks.getUser },
    from: () => ({ select: () => ({ eq: () => mocks.roles() }) }),
  }));
}

describe("Proxy session refresh and protected-route redirects", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.roles.mockResolvedValue({ data: [{ role: "student" }], error: null });
  });

  it("forwards refreshed request cookies with the nonce and CSP and returns refreshed browser cookies", async () => {
    configureClient({ refresh: true, user: { id: "student-1" } });

    const response = await proxy(request("/dashboard"));

    expect(mocks.getUser).toHaveBeenCalledOnce();
    expect(response.headers.get("x-middleware-request-cookie")).toContain("sb-session=new-token");
    expect(response.headers.get("x-middleware-request-x-nonce")).toBeTruthy();
    expect(response.headers.get("x-middleware-request-content-security-policy")).toContain("script-src");
    expect(response.headers.get("Content-Security-Policy")).toContain("script-src");
    expect(response.cookies.get("sb-session")).toMatchObject({ value: "new-token", secure: true, sameSite: "lax" });
  });

  it("preserves refreshed auth cookies and CSP on the unauthenticated login redirect", async () => {
    configureClient({ refresh: true, user: null });

    const response = await proxy(request("/practice"));

    expect(response.headers.get("location")).toBe("https://prepdmat.in/login");
    expect(response.cookies.get("sb-session")?.value).toBe("new-token");
    expect(response.headers.get("Content-Security-Policy")).toContain("script-src");
  });

  it("preserves refreshed auth cookies and CSP on an unauthorized admin redirect", async () => {
    configureClient({ refresh: true, user: { id: "student-1" } });

    const response = await proxy(request("/admin/tests"));

    expect(response.headers.get("location")).toBe("https://prepdmat.in/dashboard");
    expect(response.cookies.get("sb-session")?.value).toBe("new-token");
    expect(response.headers.get("Content-Security-Policy")).toContain("script-src");
  });

  it("keeps reviewer access and private-route authorization unchanged", async () => {
    configureClient({ refresh: false, user: { id: "reviewer-1" } });
    mocks.roles.mockResolvedValue({ data: [{ role: "reviewer" }], error: null });

    const review = await proxy(request("/admin/review"));
    const adminOnly = await proxy(request("/admin/questions"));

    expect(review.headers.get("location")).toBeNull();
    expect(new URL(adminOnly.headers.get("location")!).pathname).toBe("/dashboard");
    expect(mocks.getUser).toHaveBeenCalledTimes(2);
  });

  it("refreshes a public page for the root layout without restricting access", async () => {
    configureClient({ refresh: true, user: null });

    const response = await proxy(request("/exam-format"));

    expect(mocks.getUser).toHaveBeenCalledOnce();
    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("x-middleware-request-cookie")).toContain("sb-session=new-token");
    expect(response.cookies.get("sb-session")?.value).toBe("new-token");
    expect(response.headers.get("Content-Security-Policy")).toContain("script-src");
  });

  it("does not use a spoofed request host as the authentication redirect origin", async () => {
    configureClient({ refresh: false, user: null });

    const response = await proxy(new NextRequest("https://attacker.example/practice"));

    expect(response.headers.get("location")).toBe("https://prepdmat.in/login");
  });

  it("keeps a public page available when the Auth transport fails", async () => {
    configureClient({ refresh: false, user: null });
    mocks.getUser.mockRejectedValue(new Error("socket failure"));

    const response = await proxy(request("/exam-format"));

    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("Content-Security-Policy")).toContain("script-src");
  });
});
