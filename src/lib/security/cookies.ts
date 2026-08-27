import type { CookieOptions } from "@supabase/ssr";

export function hardenedSupabaseCookieOptions(
  options: CookieOptions | undefined,
  production = process.env.NODE_ENV === "production",
): CookieOptions {
  return {
    ...options,
    path: options?.path ?? "/",
    sameSite: options?.sameSite ?? "lax",
    secure: production || options?.secure === true,
    // Supabase's browser/SSR refresh architecture expects access to its auth
    // cookies. HttpOnly requires a different token-broker architecture and is
    // therefore intentionally not forced here.
    httpOnly: options?.httpOnly ?? false,
  };
}
