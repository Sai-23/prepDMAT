import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/auth/actions", () => ({
  googleSignInAction: vi.fn(),
  requestPhoneOtpAction: vi.fn(),
  verifyPhoneOtpAction: vi.fn(),
  verifyRegistrationEmailOtpAction: vi.fn(),
  resendVerificationAction: vi.fn(),
}));

import { AuthProviderOptions, maskPhoneNumber } from "./auth-providers";

describe("auth provider selector", () => {
  it("shows Google and one compact Email/Phone mode selector", () => {
    const html = renderToStaticMarkup(
      <AuthProviderOptions
        availability={{ google: true, phone: true }}
        emailForm={<form aria-label="Email credentials"><input name="email" /></form>}
      />,
    );

    expect(html).toContain("Continue with Google");
    expect(html).toContain('role="tablist"');
    expect(html).toContain('aria-selected="true"');
    expect(html).toContain('id="auth-email-panel"');
    expect(html).toContain('id="auth-phone-panel"');
    expect(html).toMatch(/<div[^>]*hidden=""[^>]*id="auth-phone-panel"[^>]*role="tabpanel"/);
    expect(html).toContain("Email credentials");
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

  it("masks the canonical number shown after OTP send", () => {
    expect(maskPhoneNumber("+919876543210")).toBe("+91 ••••••3210");
    expect(maskPhoneNumber("+447700900123")).toBe("+44 ••••••0123");
  });
});
