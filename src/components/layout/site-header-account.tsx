"use client";

import { ClipboardCheck, LogOut, ShieldCheck, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";

import { logoutAction } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { reconcileHeaderAccount } from "@/lib/auth/header-account-state";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { HeaderAccountState } from "@/types/auth";

function LogoutButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      className="gap-2 px-2 sm:px-3"
      disabled={pending}
      size="sm"
      title="Log out"
      type="submit"
      variant="outline"
    >
      <LogOut aria-hidden="true" className="size-4" />
      <span className="hidden sm:inline">{pending ? "Logging out..." : "Logout"}</span>
      <span className="sr-only sm:hidden">{pending ? "Logging out" : "Logout"}</span>
    </Button>
  );
}

export function SiteHeaderAccount({
  initialAccount,
}: {
  initialAccount: HeaderAccountState | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [account, setAccount] = useState(initialAccount);
  const initialUserId = initialAccount?.userId ?? null;

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let disposed = false;
    const deferredChecks = new Set<number>();

    const reconcileFromBrowser = async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      if (disposed || error) return;

      setAccount((current) => reconcileHeaderAccount(current, user));
      if ((user?.id ?? null) !== initialUserId) {
        router.refresh();
      }
    };

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "TOKEN_REFRESHED") {
        return;
      }

      const deferredCheck = window.setTimeout(() => {
        deferredChecks.delete(deferredCheck);
        if (disposed) return;
        const user = event === "SIGNED_OUT" ? null : session?.user ?? null;
        setAccount((current) => reconcileHeaderAccount(current, user));
        router.refresh();
      }, 0);
      deferredChecks.add(deferredCheck);
    });

    void reconcileFromBrowser();
    return () => {
      disposed = true;
      deferredChecks.forEach((timer) => window.clearTimeout(timer));
      data.subscription.unsubscribe();
    };
  }, [initialUserId, pathname, router]);

  if (!account) {
    return (
      <>
        <Link
          className="hidden rounded-md px-3 py-2 text-sm font-medium text-on-surface-variant transition-colors hover:bg-surface-high sm:block"
          href="/login"
        >
          Login
        </Link>
        <Link
          className="hidden rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover md:block"
          href="/register"
        >
          Register
        </Link>
      </>
    );
  }

  const roleWorkspace = account.workspace === "admin"
    ? { label: "Admin console", icon: ShieldCheck }
    : account.workspace === "reviewer"
      ? { label: "Review console", icon: ClipboardCheck }
      : null;

  return (
    <>
      {roleWorkspace ? (
        <Link
          className="flex items-center gap-2 rounded-md border border-primary px-2 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary-muted sm:px-3"
          href="/admin"
          title={`Open ${roleWorkspace.label}`}
        >
          <roleWorkspace.icon aria-hidden="true" className="size-4 shrink-0" />
          <span className="hidden xl:inline">{roleWorkspace.label}</span>
          <span className="sr-only xl:hidden">{roleWorkspace.label}</span>
        </Link>
      ) : null}
      <Link
        className="flex min-w-0 items-center gap-2 rounded-md px-2 py-2 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-high focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:px-3"
        href="/profile"
        title={`Signed in as ${account.displayName}`}
      >
        <UserRound aria-hidden="true" className="size-4 shrink-0 text-primary" />
        <span className="sr-only sm:not-sr-only sm:max-w-36 sm:truncate">{account.displayName}</span>
      </Link>
      <form action={logoutAction}>
        <LogoutButton />
      </form>
    </>
  );
}
