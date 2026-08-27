import { Suspense } from "react";
import { ClipboardCheck, LogOut, ShieldCheck, UserRound } from "lucide-react";
import Link from "next/link";

import { logoutAction } from "@/app/auth/actions";
import { SiteHeaderNavigation } from "@/components/layout/site-header-navigation";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import { resolveDisplayName } from "@/lib/auth/display-name";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/auth";

async function HeaderAccount() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <>
        <Link
          href="/login"
          className="hidden rounded-md px-3 py-2 text-sm font-medium text-on-surface-variant transition-colors hover:bg-surface-high sm:block"
        >
          Login
        </Link>
        <Link
          href="/register"
          className="hidden rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover md:block"
        >
          Register
        </Link>
      </>
    );
  }

  const [profileResult, rolesResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name, full_name")
      .eq("id", user.id)
      .maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", user.id),
  ]);
  const profile = profileResult.data;
  const roles = ((rolesResult.data ?? []) as Array<{ role: UserRole }>).map(
    ({ role }) => role,
  );
  const roleWorkspace = roles.includes("admin")
    ? { label: "Admin console", icon: ShieldCheck }
    : roles.includes("reviewer")
      ? { label: "Review console", icon: ClipboardCheck }
      : null;

  const displayName = resolveDisplayName({
    profileDisplayName: profile?.display_name,
    profileFullName: profile?.full_name,
    metadataDisplayName: user.user_metadata.display_name,
    metadataFullName: user.user_metadata.full_name,
    email: user.email,
  });

  return (
    <>
      {roleWorkspace ? (
        <Link
          href="/admin"
          className="flex items-center gap-2 rounded-md border border-primary px-2 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary-muted sm:px-3"
          title={`Open ${roleWorkspace.label}`}
        >
          <roleWorkspace.icon aria-hidden="true" className="size-4 shrink-0" />
          <span className="hidden xl:inline">{roleWorkspace.label}</span>
          <span className="sr-only xl:hidden">{roleWorkspace.label}</span>
        </Link>
      ) : null}
      <Link
        href="/profile"
        className="flex min-w-0 items-center gap-2 rounded-md px-2 py-2 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-high focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:px-3"
        title={`Signed in as ${displayName}`}
      >
        <UserRound aria-hidden="true" className="size-4 shrink-0 text-primary" />
        <span className="sr-only sm:not-sr-only sm:max-w-36 sm:truncate">{displayName}</span>
      </Link>
      <form action={logoutAction}>
        <Button
          type="submit"
          variant="outline"
          size="sm"
          className="gap-2 px-2 sm:px-3"
          title="Log out"
        >
          <LogOut aria-hidden="true" className="size-4" />
          <span className="hidden sm:inline">Logout</span>
          <span className="sr-only sm:hidden">Logout</span>
        </Button>
      </form>
    </>
  );
}

function HeaderAccountFallback() {
  return (
    <div
      aria-hidden="true"
      className="h-9 w-28 animate-pulse rounded-md bg-surface-high"
    />
  );
}

export function SiteHeader() {
  return (
    <header
      className="sticky top-0 z-40 border-b border-workspace-border bg-surface-lowest/95 backdrop-blur"
      data-site-header
    >
      <div className="mx-auto flex min-h-14 w-full max-w-7xl items-center justify-between gap-2 px-4 py-2 sm:gap-4 lg:px-6">
        <Link href="/" className="flex items-center gap-2 sm:gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-md border border-primary bg-primary text-sm font-bold text-primary-foreground">
            dM
          </span>
          <div className="hidden sm:block">
            <p className="text-sm font-semibold tracking-[0.12em] text-on-surface">
              dMAT Prep
            </p>
            <p className="hidden text-xs text-muted-foreground sm:block">
              Technical academic workspace
            </p>
          </div>
        </Link>

        <SiteHeaderNavigation />

        <div className="flex items-center gap-1 sm:gap-2">
          <div className="hidden xl:block">
            <ThemeToggle />
          </div>
          <div className="xl:hidden">
            <ThemeToggle compact />
          </div>
          <Suspense fallback={<HeaderAccountFallback />}>
            <HeaderAccount />
          </Suspense>
        </div>
      </div>
    </header>
  );
}
