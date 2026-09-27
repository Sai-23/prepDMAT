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

    expect(response.headers.get("location")).toBe("https://prepdmat.in/login?next=%2Fpractice");
    expect(response.cookies.get("sb-session")?.value).toBe("new-token");
    expect(response.headers.get("Content-Security-Policy")).toContain("script-src");
  });

  it("preserves the complete feedback destination for a signed-out visitor", async () => {
    configureClient({ refresh: false, user: null });

    const response = await proxy(request("/feedback?source=email"));
    const destination = new URL(response.headers.get("location")!);

    expect(destination.pathname).toBe("/login");
    expect(destination.searchParams.get("next")).toBe("/feedback?source=email");
  });

  it("allows a signed-in visitor to reach feedback without an auth redirect", async () => {
    configureClient({ refresh: false, user: { id: "student-1" } });

    const response = await proxy(request("/feedback"));

    expect(response.headers.get("location")).toBeNull();
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

  it("keeps an anonymous public page out of the Supabase session path", async () => {
    configureClient({ refresh: true, user: null });

    const response = await proxy(request("/exam-format"));

    expect(mocks.createServerClient).not.toHaveBeenCalled();
    expect(mocks.getUser).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("x-middleware-request-x-nonce")).toBeTruthy();
    expect(response.headers.get("Content-Security-Policy")).toContain("script-src");
  });

  it("does not use a spoofed request host as the authentication redirect origin", async () => {
    configureClient({ refresh: false, user: null });

    const response = await proxy(new NextRequest("https://attacker.example/practice"));

    expect(response.headers.get("location")).toBe("https://prepdmat.in/login?next=%2Fpractice");
  });

  it("keeps an anonymous public page independent of Auth transport state", async () => {
    configureClient({ refresh: false, user: null });
    mocks.getUser.mockRejectedValue(new Error("socket failure"));

    const response = await proxy(request("/exam-format"));

    expect(mocks.getUser).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("Content-Security-Policy")).toContain("script-src");
  });
});
