import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("registration viewport and interaction contract", () => {
  const register = source("src/app/register/page.tsx");
  const form = source("src/components/auth/auth-form.tsx");
  const providers = source("src/components/auth/auth-providers.tsx");

  it("keeps every required registration control in one compact document flow", () => {
    for (const label of [
      "Continue with Google",
      'name: "email"',
      'name: "password"',
      'name: "confirmPassword"',
      'submitLabel="Create account"',
    ]) {
      expect(`${providers}\n${register}`).toContain(label);
    }
    expect(register).toContain("<AuthProviderOptions compact");
    expect(register).toContain("compact");
    expect(register).not.toContain('name: "fullName"');
    expect(`${register}\n${form}`).not.toMatch(/overflow-y-(auto|scroll)|\bfixed\b|\bsticky\b|absolute[^\n]*Create account/);
  });

  it("preserves accessible touch targets and mobile-safe widths", () => {
    expect(form).toContain('className="min-h-11 w-full"');
    expect(form).toContain("w-full rounded-md border");
    expect(register).toContain("w-full max-w-md px-4");
    expect(register).not.toMatch(/min-w-\[[4-9]\d{2}px\]/);
  });

  it("guards registration, verification, resend, and Google actions against duplicate starts", () => {
    expect(form.match(/if \(inFlight\.current\) return previousState;/g)?.length).toBeGreaterThanOrEqual(3);
    expect(providers).toContain("if (inFlight.current) return previousState;");
    expect(form).toContain("disabled={pending || !complete}");
    expect(providers).toContain("disabled={pending}");
  });

  it("keeps OTP out of the ordinary login form", () => {
    const login = source("src/app/login/page.tsx");
    expect(login).toContain('name: "email"');
    expect(login).toContain('name: "password"');
    expect(login).not.toContain('name: "token"');
    expect(login).not.toContain("send login code");
  });

  it("resets verification state in place when a student changes email", () => {
    expect(form).toContain("onChangeEmail={onReset}");
    expect(form).toContain("setGeneration((current) => current + 1)");
    expect(form).toContain("key={generation}");
    expect(form).toContain('autoFocus={field.name === "email"}');
    expect(form).toContain("Use a different email");
    expect(form).not.toContain('href="/register"');
  });
});
