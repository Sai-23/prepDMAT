import { type NextRequest, NextResponse } from "next/server";

import { getApplicationUrl } from "@/lib/auth/config";
import { getPostAuthRoute } from "@/lib/auth/post-auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function callbackErrorUrl() {
  const errorUrl = getApplicationUrl("/login");
  errorUrl.searchParams.set("error", "auth_callback");
  return errorUrl;
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const flow = request.nextUrl.searchParams.get("flow");
  const providerError = request.nextUrl.searchParams.has("error");
  const supabase = await createSupabaseServerClient();

  if (code && !providerError) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      if (flow === "recovery") {
        return NextResponse.redirect(getApplicationUrl("/reset-password"));
      }
      return NextResponse.redirect(getApplicationUrl(await getPostAuthRoute(data.user.id)));
    }
  }

  if (!providerError) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      return NextResponse.redirect(getApplicationUrl(await getPostAuthRoute(user.id)));
    }
  }

  return NextResponse.redirect(callbackErrorUrl());
}
