import Link from "next/link";

import { SiteHeaderAccount } from "@/components/layout/site-header-account";
import { SiteHeaderNavigation } from "@/components/layout/site-header-navigation";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import type { HeaderAccountState } from "@/types/auth";

export function SiteHeader({
  initialAccount,
}: {
  initialAccount: HeaderAccountState | null;
}) {
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
              Prepare with clarity
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
          <SiteHeaderAccount
            initialAccount={initialAccount}
            key={initialAccount
              ? `${initialAccount.userId}:${initialAccount.displayName}:${initialAccount.workspace ?? "student"}`
              : "anonymous"}
          />
        </div>
      </div>
    </header>
  );
}
