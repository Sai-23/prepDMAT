"use client";

import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/types/database";

function requireBrowserEnv(
  value: string | undefined,
  name: "NEXT_PUBLIC_SUPABASE_URL" | "NEXT_PUBLIC_SUPABASE_ANON_KEY",
) {
  if (!value) {
    throw new Error(`Missing public environment variable: ${name}`);
  }

  return value;
}

export function createSupabaseBrowserClient() {
  return createBrowserClient<Database>(
    // Next.js only substitutes browser environment variables when their
    // property names are statically referenced at build time.
    requireBrowserEnv(process.env.NEXT_PUBLIC_SUPABASE_URL, "NEXT_PUBLIC_SUPABASE_URL"),
    requireBrowserEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, "NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  );
}
