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
});
