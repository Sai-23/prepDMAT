import { describe, expect, it } from "vitest";

import {
  maskEmailAddress,
  parseEmailVerificationOtpType,
} from "./email-verification";

describe("email verification helpers", () => {
  it("accepts only supported Supabase email verification types", () => {
    expect(parseEmailVerificationOtpType("email")).toBe("email");
    expect(parseEmailVerificationOtpType("signup")).toBe("signup");
    expect(parseEmailVerificationOtpType("sms")).toBeNull();
    expect(parseEmailVerificationOtpType(null)).toBeNull();
  });

  it("masks the mailbox while retaining recognizable context", () => {
    expect(maskEmailAddress("sachin36@gmail.com")).toBe("sa***36@gmail.com");
    expect(maskEmailAddress("ab@example.com")).toBe("a***@example.com");
    expect(maskEmailAddress("not-an-email")).toBe("your email address");
  });
});

