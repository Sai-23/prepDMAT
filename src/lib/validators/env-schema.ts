import { z } from "zod";

export const envSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_GOOGLE_AUTH_ENABLED: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  NEXT_PUBLIC_PHONE_AUTH_ENABLED: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  SECURITY_RATE_LIMIT_SECRET: z.preprocess(
    (value) => value === "" ? undefined : value,
    z.string().min(32).optional(),
  ),
  TRUSTED_CLIENT_IP_HEADER: z
    .enum(["none", "x-real-ip", "x-forwarded-for", "cf-connecting-ip"])
    .default("none"),
  FREE_LAUNCH_ACCESS_ENABLED: z
    .enum(["true", "false"])
    .default("true")
    .transform((value) => value === "true"),
  ENABLE_ON_DEMAND_CORE_MOCKS: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  CORE_MOCK_HISTORY_WINDOW: z.coerce.number().int().min(1).max(5).default(3),
  CORE_MOCK_GENERATION_COOLDOWN_SECONDS: z.coerce
    .number()
    .int()
    .min(0)
    .max(300)
    .default(30),
  OMNIROUTE_BASE_URL: z.preprocess(
    (value) => value === "" ? undefined : value,
    z.string().url().optional(),
  ),
  OMNIROUTE_API_KEY: z.preprocess(
    (value) => value === "" ? undefined : value,
    z.string().min(1).optional(),
  ),
  OMNIROUTE_GAM_MODEL: z.preprocess(
    (value) => value === "" ? undefined : value,
    z.string().min(1).max(200).optional(),
  ),
  OMNIROUTE_GAM_TIMEOUT_MS: z.coerce.number().int().min(10_000).max(120_000).default(55_000),
  OMNIROUTE_GAM_DAILY_LIMIT: z.coerce.number().int().min(1).max(100).default(25),
});

export function parseEnv(input: Record<string, string | undefined>) {
  return envSchema.safeParse({
    NEXT_PUBLIC_APP_URL: input.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_SUPABASE_URL: input.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: input.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_GOOGLE_AUTH_ENABLED: input.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED,
    NEXT_PUBLIC_PHONE_AUTH_ENABLED: input.NEXT_PUBLIC_PHONE_AUTH_ENABLED,
    SUPABASE_SERVICE_ROLE_KEY: input.SUPABASE_SERVICE_ROLE_KEY,
    SECURITY_RATE_LIMIT_SECRET: input.SECURITY_RATE_LIMIT_SECRET,
    TRUSTED_CLIENT_IP_HEADER: input.TRUSTED_CLIENT_IP_HEADER,
    FREE_LAUNCH_ACCESS_ENABLED: input.FREE_LAUNCH_ACCESS_ENABLED,
    ENABLE_ON_DEMAND_CORE_MOCKS: input.ENABLE_ON_DEMAND_CORE_MOCKS,
    CORE_MOCK_HISTORY_WINDOW: input.CORE_MOCK_HISTORY_WINDOW,
    CORE_MOCK_GENERATION_COOLDOWN_SECONDS:
      input.CORE_MOCK_GENERATION_COOLDOWN_SECONDS,
    OMNIROUTE_BASE_URL: input.OMNIROUTE_BASE_URL,
    OMNIROUTE_API_KEY: input.OMNIROUTE_API_KEY,
    OMNIROUTE_GAM_MODEL: input.OMNIROUTE_GAM_MODEL,
    OMNIROUTE_GAM_TIMEOUT_MS: input.OMNIROUTE_GAM_TIMEOUT_MS,
    OMNIROUTE_GAM_DAILY_LIMIT: input.OMNIROUTE_GAM_DAILY_LIMIT,
  });
}

export type Env = z.infer<typeof envSchema>;
