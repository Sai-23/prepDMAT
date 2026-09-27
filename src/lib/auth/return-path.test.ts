import { describe, expect, it } from "vitest";

import { getSafeReturnPath, loginPath, registerPath } from "./return-path";

describe("safe post-auth return paths", () => {
  it.each([
    "/feedback",
    "/feedback?source=email",
    "/dashboard",
    "/practice",
    "/tests/mock-id?section=2",
    "/results#latest",
  ])("accepts the internal destination %s", (value) => {
    expect(getSafeReturnPath(value)).toBe(value);
  });

  it.each([
    "https://evil.example",
    "http://evil.example",
    "//evil.example",
    "javascript:alert(1)",
    "data:text/html,evil",
    "\\evil.example",
    "/\\evil.example",
    "%2F%2Fevil.example",
    "%252F%252Fevil.example",
    "/%5Cevil.example",
    "/%255Cevil.example",
    "/%2F%2Fevil.example",
    "%E0%A4%A",
    "/login",
    "/register?next=/feedback",
    "/auth/callback?next=/feedback",
  ])("rejects the unsafe or looping destination %s", (value) => {
    expect(getSafeReturnPath(value)).toBeNull();
  });

  it("preserves safe query strings between login and registration", () => {
    expect(loginPath("/feedback?source=email")).toBe("/login?next=%2Ffeedback%3Fsource%3Demail");
    expect(registerPath("/feedback")).toBe("/register?next=%2Ffeedback");
  });
});
