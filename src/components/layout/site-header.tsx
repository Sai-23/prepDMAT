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
      <div className="mx-auto flex h-[82px] w-full max-w-[1700px] items-center px-3 sm:px-6 lg:px-12">

        <Link
          href="/"
          className="flex shrink-0 items-center"
          aria-label="PrepDMAT home"
        >
          <Image
            src="/branding/icons/icon-192.png"
            alt=""
            width={192}
            height={192}
            priority
            className="size-10 object-contain sm:hidden"
          />
          <span className="hidden sm:flex">
            <Image
              src="/branding/logo/prepdmat-logo-light.png"
              alt=""
              width={800}
              height={300}
              priority
              className="prepdmat-logo-light h-auto w-[180px] object-contain xl:w-[220px]"
            />

            <Image
              src="/branding/logo/prepdmat-logo-dark.png"
              alt=""
              width={800}
              height={300}
              priority
              className="prepdmat-logo-dark h-auto w-[180px] object-contain xl:w-[220px]"
            />
          </span>
        </Link>

        <div className="ml-3 flex flex-1 items-center sm:ml-6 lg:ml-10">
          <SiteHeaderNavigation
            diagnosticStatus={diagnosticStatus}
            isAuthenticated={initialAccount !== null}
          />
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
