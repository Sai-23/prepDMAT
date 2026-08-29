import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/auth/actions", () => ({
  resendVerificationAction: vi.fn(),
  verifyRegistrationEmailOtpAction: vi.fn(),
}));

import { EmailVerificationOtp } from "./auth-form";

describe("email verification OTP server prerender", () => {
  it("renders a masked, accessible six-digit OTP form without polling", () => {
    const html = renderToStaticMarkup(
      <EmailVerificationOtp
        email="sachin36@gmail.com"
        message="Enter the 6-digit code sent to your email."
      />,
    );
    const visibleHtml = html.replace(/<input[^>]+type="hidden"[^>]*>/g, "");

    expect(html).toContain("Verify your email");
    expect(html).toContain('autoComplete="one-time-code"');
    expect(html).toContain('inputMode="numeric"');
    expect(html).toContain('maxLength="6"');
    expect(html).toContain('pattern="[0-9]{6}"');
    expect(html).toContain("Verify email");
    expect(html).toContain("disabled");
    expect(html).toContain("sa***36@gmail.com");
    expect(visibleHtml).not.toContain("sachin36@gmail.com");
  });
});
