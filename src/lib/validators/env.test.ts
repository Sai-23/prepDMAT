import { describe, expect, it } from "vitest";

import { parseEnv } from "./env-schema";

describe("parseEnv", () => {
  it("accepts a complete environment configuration", () => {
    const result = parseEnv({
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
      NEXT_PUBLIC_SUPABASE_URL: "https://demo.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
      SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
    });

    expect(result.success).toBe(true);
  });

  it("rejects invalid public urls", () => {
    const result = parseEnv({
      NEXT_PUBLIC_APP_URL: "not-a-url",
      NEXT_PUBLIC_SUPABASE_URL: "not-a-url",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
    });

    expect(result.success).toBe(false);
  });

  it("keeps on-demand mocks off by default and validates rollout limits", () => {
    const defaults = parseEnv({
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
      NEXT_PUBLIC_SUPABASE_URL: "https://demo.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
    });
    expect(defaults.success && defaults.data.ENABLE_ON_DEMAND_CORE_MOCKS).toBe(false);
    expect(defaults.success && defaults.data.CORE_MOCK_HISTORY_WINDOW).toBe(3);
    expect(defaults.success && defaults.data.CORE_MOCK_GENERATION_COOLDOWN_SECONDS).toBe(30);
    expect(defaults.success && defaults.data.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED).toBe(false);
    expect(defaults.success && defaults.data.NEXT_PUBLIC_PHONE_AUTH_ENABLED).toBe(false);
    expect(defaults.success && defaults.data.FREE_LAUNCH_ACCESS_ENABLED).toBe(true);
    expect(defaults.success && defaults.data.TRUSTED_CLIENT_IP_HEADER).toBe("none");

    const invalid = parseEnv({
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
      NEXT_PUBLIC_SUPABASE_URL: "https://demo.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
      ENABLE_ON_DEMAND_CORE_MOCKS: "true",
      CORE_MOCK_HISTORY_WINDOW: "99",
      CORE_MOCK_GENERATION_COOLDOWN_SECONDS: "999",
    });
    expect(invalid.success).toBe(false);
  });

  it("validates security-only configuration without exposing it publicly", () => {
    const configured = parseEnv({
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
      NEXT_PUBLIC_SUPABASE_URL: "https://demo.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
      SECURITY_RATE_LIMIT_SECRET: "a-secure-independent-rate-limit-key",
      TRUSTED_CLIENT_IP_HEADER: "cf-connecting-ip",
      FREE_LAUNCH_ACCESS_ENABLED: "false",
    });

    expect(configured.success && configured.data.TRUSTED_CLIENT_IP_HEADER).toBe("cf-connecting-ip");
    expect(configured.success && configured.data.FREE_LAUNCH_ACCESS_ENABLED).toBe(false);

    const invalid = parseEnv({
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
      NEXT_PUBLIC_SUPABASE_URL: "https://demo.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
      SECURITY_RATE_LIMIT_SECRET: "short",
      TRUSTED_CLIENT_IP_HEADER: "client-ip",
    });
    expect(invalid.success).toBe(false);
  });

  it("only enables authentication providers through explicit boolean flags", () => {
    const enabled = parseEnv({
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
      NEXT_PUBLIC_SUPABASE_URL: "https://demo.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
      NEXT_PUBLIC_GOOGLE_AUTH_ENABLED: "true",
      NEXT_PUBLIC_PHONE_AUTH_ENABLED: "true",
    });
    expect(enabled.success && enabled.data.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED).toBe(true);
    expect(enabled.success && enabled.data.NEXT_PUBLIC_PHONE_AUTH_ENABLED).toBe(true);

    const invalid = parseEnv({
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
      NEXT_PUBLIC_SUPABASE_URL: "https://demo.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
      NEXT_PUBLIC_PHONE_AUTH_ENABLED: "yes",
    });
    expect(invalid.success).toBe(false);
  });
});
