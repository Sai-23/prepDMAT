"use client";

import { useEffect, useState } from "react";

import { SiteHeader } from "@/components/layout/site-header";
import { reconcileHeaderAccount } from "@/lib/auth/header-account-state";
import { resolveDisplayName } from "@/lib/auth/display-name";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { StudentDiagnosticStatus } from "@/lib/constants/navigation";
import type { HeaderAccountState, UserRole } from "@/types/auth";

type PublicHeaderState = {
  account: HeaderAccountState | null;
  diagnosticStatus: StudentDiagnosticStatus | null;
};

export function PublicSiteHeader() {
  const [state, setState] = useState<PublicHeaderState | undefined>();

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let disposed = false;
    const deferredChecks = new Set<number>();

    const load = async () => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (disposed) return;
      if (userError || !user) {
        setState({ account: null, diagnosticStatus: null });
        return;
      }

      const { data: headerState } = await supabase
        .from("user_header_state")
        .select("display_name, full_name, diagnostic_status, roles")
        .eq("id", user.id)
        .maybeSingle();
      if (disposed) return;

      const roles = (headerState?.roles ?? []) as UserRole[];
      setState({
        account: headerState
          ? {
              userId: user.id,
              displayName: resolveDisplayName({
                profileDisplayName: headerState.display_name,
                profileFullName: headerState.full_name,
                metadataDisplayName: user.user_metadata.display_name,
                metadataFullName: user.user_metadata.full_name,
                email: user.email,
                phone: user.phone,
              }),
              workspace: roles.includes("admin")
                ? "admin"
                : roles.includes("reviewer")
                  ? "reviewer"
                  : null,
            }
          : reconcileHeaderAccount(null, user),
        diagnosticStatus: headerState?.diagnostic_status ?? null,
      });
    };

    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT") return;
      const deferredCheck = window.setTimeout(() => {
        deferredChecks.delete(deferredCheck);
        if (!disposed) void load();
      }, 0);
      deferredChecks.add(deferredCheck);
    });

    void load();
    return () => {
      disposed = true;
      deferredChecks.forEach((timer) => window.clearTimeout(timer));
      data.subscription.unsubscribe();
    };
  }, []);

  return (
    <SiteHeader
      accountPending={state === undefined}
      browserReconciliation={false}
      diagnosticStatus={state?.diagnosticStatus ?? null}
      initialAccount={state?.account ?? null}
    />
  );
}
