import { describe, expect, it } from "vitest";

import { normalizePhoneNumber, registerSchema } from "./schemas";

describe("auth schemas", () => {
  it("requires matching, reasonably strong passwords", () => {
    expect(
      registerSchema.safeParse({
        fullName: "Ada Lovelace",
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
        fullName: "Ada Lovelace",
        email: "ada@example.com",
        password: "numbers123",
        confirmPassword: "numbers123",
        marketingEmailOptIn: false,
      }).success,
    ).toBe(true);
  });

  it("normalizes supported phone input to E.164 and rejects malformed input", () => {
    expect(normalizePhoneNumber("+91", "98765 43210")).toBe("+919876543210");
    expect(normalizePhoneNumber("+1", "+44 7700 900123")).toBe("+447700900123");
    expect(normalizePhoneNumber("+91", "123")).toBeNull();
  });
});
