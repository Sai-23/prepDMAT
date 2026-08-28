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
  <div className="mx-auto flex h-[82px] w-full max-w-[1700px] items-center px-8 lg:px-12">

    <Link
      href="/"
      className="flex shrink-0 items-center"
      aria-label="PrepDMAT home"
    >
      <Image
  src="/branding/logo/prepdmat-logo-light.png"
  alt="PrepDMAT"
  width={800}
  height={300}
  priority
  className="prepdmat-logo-light h-auto w-[220px] object-contain"
/>

<Image
  src="/branding/logo/prepdmat-logo-dark.png"
  alt="PrepDMAT"
  width={800}
  height={300}
  priority
  className="prepdmat-logo-dark h-auto w-[220px] object-contain"
/>
    </Link>

    <div className="ml-14 flex flex-1 items-center">
      <SiteHeaderNavigation diagnosticStatus={diagnosticStatus} />
    </div>

    <div className="ml-auto flex items-center gap-2">
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