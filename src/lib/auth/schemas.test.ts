import { describe, expect, it } from "vitest";

import {
  emailVerificationOtpSchema,
  loginSchema,
  normalizePhoneNumber,
  registerSchema,
} from "./schemas";

describe("auth schemas", () => {
  it("requires matching, reasonably strong passwords", () => {
    expect(
      registerSchema.safeParse({
        email: "ada@example.com",
        password: "numbers123",
        confirmPassword: "different123",
        marketingEmailOptIn: false,
      }).success,
    ).toBe(false);
  });

  it("accepts a valid registration", () => {
    expect(
      registerSchema.safeParse({
        email: "ada@example.com",
        password: "numbers123",
        confirmPassword: "numbers123",
        marketingEmailOptIn: false,
      }).success,
    ).toBe(true);
  });

  it("rejects oversized credential fields before provider work", () => {
    expect(loginSchema.safeParse({
      email: `${"a".repeat(245)}@example.com`,
      password: "password1",
    }).success).toBe(false);
    expect(loginSchema.safeParse({
      email: "ada@example.com",
      password: `a1${"x".repeat(127)}`,
    }).success).toBe(false);
    expect(registerSchema.safeParse({
      email: "ada@example.com",
      password: `a1${"x".repeat(127)}`,
      confirmPassword: `a1${"x".repeat(127)}`,
      marketingEmailOptIn: false,
    }).success).toBe(false);
  });

  it("accepts exactly six numeric email verification digits", () => {
    expect(emailVerificationOtpSchema.safeParse({
      email: "ada@example.com",
      token: "123456",
    }).success).toBe(true);
    for (const token of ["12345", "1234567", "12345a", "１２３４５６"]) {
      expect(emailVerificationOtpSchema.safeParse({
        email: "ada@example.com",
        token,
      }).success).toBe(false);
    }
  });

  it("normalizes supported phone input to E.164 and rejects malformed input", () => {
    expect(normalizePhoneNumber("+91", "98765 43210")).toBe("+919876543210");
    expect(normalizePhoneNumber("+1", "+44 7700 900123")).toBe("+447700900123");
    expect(normalizePhoneNumber("+91", "123")).toBeNull();
  });
});
