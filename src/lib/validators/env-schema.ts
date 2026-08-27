import { z } from "zod";

export const envSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
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
});

export function parseEnv(input: Record<string, string | undefined>) {
  return envSchema.safeParse({
    NEXT_PUBLIC_APP_URL: input.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_SUPABASE_URL: input.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: input.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: input.SUPABASE_SERVICE_ROLE_KEY,
    ENABLE_ON_DEMAND_CORE_MOCKS: input.ENABLE_ON_DEMAND_CORE_MOCKS,
    CORE_MOCK_HISTORY_WINDOW: input.CORE_MOCK_HISTORY_WINDOW,
    CORE_MOCK_GENERATION_COOLDOWN_SECONDS:
      input.CORE_MOCK_GENERATION_COOLDOWN_SECONDS,
  });
}

export type Env = z.infer<typeof envSchema>;
