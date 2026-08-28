import Image from "next/image";
import Link from "next/link";

import { SiteHeaderAccount } from "@/components/layout/site-header-account";
import { SiteHeaderNavigation } from "@/components/layout/site-header-navigation";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import type { HeaderAccountState } from "@/types/auth";
import type { StudentDiagnosticStatus } from "@/lib/constants/navigation";

export function SiteHeader({
  initialAccount,
  diagnosticStatus,
}: {
  initialAccount: HeaderAccountState | null;
  diagnosticStatus: StudentDiagnosticStatus | null;
}) {
  return (
    <header
  className="sticky top-0 z-40 border-b border-workspace-border bg-surface-lowest/95 backdrop-blur"
  data-site-header
>
<div className="mx-auto flex min-h-[54px] w-full max-w-[1500px] items-center justify-between gap-3 px-5 py-0.5 lg:px-8">    <Link
      href="/"
      className="flex shrink-0 items-center"
      aria-label="PrepDMAT home"
    >
      <Image
        src="/branding/logo/prepdmat-logo-dark.png"
        alt="PrepDMAT"
        width={800}
        height={300}
        priority
        className="hidden h-auto w-[175px] object-contain dark:block lg:w-[180px]"
      />

      <Image
        src="/branding/logo/prepdmat-logo-light.png"
        alt="PrepDMAT"
        width={800}
        height={300}
        priority
        className="h-auto w-[175px] object-contain dark:hidden lg:w-[180px]"
      />
    </Link>

    <SiteHeaderNavigation diagnosticStatus={diagnosticStatus} />

    <div className="flex items-center gap-1 sm:gap-2">
      <div className="hidden xl:block">
        <ThemeToggle />
      </div>

      <div className="xl:hidden">
        <ThemeToggle compact />
      </div>

      <SiteHeaderAccount
        initialAccount={initialAccount}
        key={
          initialAccount
            ? `${initialAccount.userId}:${initialAccount.displayName}:${initialAccount.workspace ?? "student"}`
            : "anonymous"
        }
      />
    </div>

  </div>
</header>
  );
}