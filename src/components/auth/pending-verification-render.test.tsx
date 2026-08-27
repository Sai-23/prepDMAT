import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createBrowserClient: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace, refresh: mocks.refresh }),
}));
vi.mock("@/lib/supabase/client", () => ({
  createSupabaseBrowserClient: mocks.createBrowserClient,
}));
vi.mock("@/app/auth/actions", () => ({
  resendVerificationAction: vi.fn(),
}));

import { CheckEmail } from "./auth-form";

describe("pending verification server prerender", () => {
  it("renders safely without constructing a browser-only Supabase client", () => {
    const html = renderToStaticMarkup(
      <CheckEmail
        email="sachin36@gmail.com"
        message="Confirm your email to finish creating your account."
      />,
    );
    const visibleHtml = html.replace(/<input[^>]+type="hidden"[^>]*>/g, "");

    expect(html).toContain("Check your email");
    expect(html).toContain("If you open the link in this browser");
    expect(html).toContain("sa***36@gmail.com");
    expect(visibleHtml).not.toContain("sachin36@gmail.com");
    expect(mocks.createBrowserClient).not.toHaveBeenCalled();
  });
});
