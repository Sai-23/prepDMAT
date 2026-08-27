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
  let response = NextResponse.next({
    request: { headers: requestHeaders },
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

          response = NextResponse.next({
            request: { headers: requestHeaders },
          });

          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, hardenedSupabaseCookieOptions(options)),
          );
        },
      },
    },
  );

  return { supabase, response };
}
