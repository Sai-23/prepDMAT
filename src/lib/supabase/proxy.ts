import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { hardenedSupabaseCookieOptions } from "@/lib/security/cookies";
import type { Database } from "@/types/database";

type CookieMutation = {
  name: string;
  value: string;
  options?: CookieOptions;
};

export function updateSupabaseSession(request: NextRequest, requestHeaders = request.headers) {
  // Forward the nonce/CSP headers supplied by Proxy and keep its Cookie header
  // synchronized with any tokens rotated by Supabase during getUser().
  const forwardedHeaders = new Headers(requestHeaders);
  let response = NextResponse.next({
    request: { headers: forwardedHeaders },
  });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieMutation[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          forwardedHeaders.set("cookie", request.cookies.toString());

          response = NextResponse.next({
            request: { headers: forwardedHeaders },
          });

          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, hardenedSupabaseCookieOptions(options)),
          );
        },
      },
    },
  );

  // getUser() can refresh after this function returns. A getter avoids handing
  // Proxy the superseded response that existed before the cookie mutation.
  return { supabase, get response() { return response; } };
}
