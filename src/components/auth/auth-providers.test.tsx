import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/auth/actions", () => ({
  googleSignInAction: vi.fn(),
}));

import { AuthProviderOptions } from "./auth-providers";

describe("auth provider selector", () => {
  it("shows Google and email without rendering phone authentication UI", () => {
    const html = renderToStaticMarkup(
      <AuthProviderOptions
        availability={{ google: true, phone: true }}
        emailForm={<form aria-label="Email credentials"><input name="email" /></form>}
      />,
    );

    expect(html).toContain("Continue with Google");
    expect(html).toContain("Email credentials");
    expect(html).not.toContain("Phone");
    expect(html).not.toContain("phone-number");
    expect(html).not.toContain("auth-phone-panel");
    expect(html).not.toContain("Send code");
    expect(html).not.toContain('role="tablist"');
  });

  it("keeps the email form and hides disabled providers", () => {
    const html = renderToStaticMarkup(
      <AuthProviderOptions
        availability={{ google: false, phone: false }}
        emailForm={<form aria-label="Email only" />}
      />,
    );

    expect(html).toContain("Email only");
    expect(html).not.toContain("Continue with Google");
    expect(html).not.toContain('role="tablist"');
  });
});
