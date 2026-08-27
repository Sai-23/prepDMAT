import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
  useRouter: () => ({ refresh: vi.fn() }),
}));
vi.mock("@/app/auth/actions", () => ({
  logoutAction: vi.fn(),
}));
vi.mock("@/lib/supabase/client", () => ({
  createSupabaseBrowserClient: vi.fn(),
}));

import { SiteHeaderAccount } from "./site-header-account";

describe("server-initialized site header account", () => {
  it("renders user and logout navigation for an authenticated server snapshot", () => {
    const html = renderToStaticMarkup(<SiteHeaderAccount initialAccount={{
      userId: "user-1",
      displayName: "Sai",
      workspace: null,
    }} />);

    expect(html).toContain("Sai");
    expect(html).toContain("Logout");
    expect(html).not.toContain(">Login<");
    expect(html).not.toContain(">Register<");
  });

  it("renders login and register navigation for an anonymous server snapshot", () => {
    const html = renderToStaticMarkup(<SiteHeaderAccount initialAccount={null} />);

    expect(html).toContain("Login");
    expect(html).toContain("Register");
    expect(html).not.toContain("Logout");
  });
});
