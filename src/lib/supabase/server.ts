import "server-only";

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

import { hardenedSupabaseCookieOptions } from "@/lib/security/cookies";
import { getEnv } from "@/lib/validators/env";
import type { Database } from "@/types/database";

type CookieMutation = {
  name: string;
  value: string;
  options?: CookieOptions;
};

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  const env = getEnv();

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieMutation[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, hardenedSupabaseCookieOptions(options));
            });
          } catch {
            // Server Components cannot persist cookies after rendering.
          }
        },
      },
    },
  );
}
