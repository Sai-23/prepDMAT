"use client";

import { Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  diagnosticNavigationItem,
  primaryNavigation,
  studentNavigation,
  type StudentDiagnosticStatus,
} from "@/lib/constants/navigation";
import { cn } from "@/lib/utils";

export function SiteHeaderNavigation({
  diagnosticStatus = null,
  isAuthenticated = false,
}: {
  diagnosticStatus?: StudentDiagnosticStatus | null;
  isAuthenticated?: boolean;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const effectiveDiagnosticStatus = pathname.startsWith("/onboarding/diagnostic/summary")
    ? "completed"
    : pathname === "/onboarding/diagnostic"
      ? "in_progress"
      : diagnosticStatus;
  const navigation = primaryNavigation.map((item) =>
    item.href === "/diagnostic" ? diagnosticNavigationItem(effectiveDiagnosticStatus) : item,
  );

  const mobileNavigation = [
    ...navigation,
    ...studentNavigation.filter(
      (item) => !navigation.some((primary) => primary.href === item.href),
    ),
  ];

  return (
    <>
      <nav aria-label="Primary navigation" className="hidden items-center gap-2 lg:flex">
        {navigation.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === item.href
              : pathname.startsWith(item.href);

          return (
            <Link
              aria-current={isActive ? "page" : undefined}
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-md px-3 py-2 text-sm font-medium text-on-surface-variant transition-colors hover:bg-surface-high hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                isActive && "bg-primary-muted text-primary ring-1 ring-primary",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="lg:hidden">
        <Button
          aria-expanded={mobileOpen}
          aria-haspopup="dialog"
          aria-label="Open navigation"
          className="min-h-11 min-w-11 px-2"
          onClick={() => setMobileOpen(true)}
          size="sm"
          variant="outline"
        >
          <Menu aria-hidden="true" className="size-4" />
          <span className="hidden sm:inline">Menu</span>
        </Button>
        <Dialog
          onOpenChange={setMobileOpen}
          open={mobileOpen}
          title="Navigation"
        >
          <nav aria-label="Mobile navigation" className="grid gap-1">
            {mobileNavigation.map((item) => {
              const isActive =
                item.href === "/"
                  ? pathname === item.href
                  : pathname.startsWith(item.href);

              return (
                <Link
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "min-h-11 rounded-md px-3 py-3 text-sm font-medium text-on-surface-variant transition-colors hover:bg-surface-high hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                    isActive && "bg-primary-muted text-primary ring-1 ring-primary",
                  )}
                  href={item.href}
                  key={item.href}
                  onClick={() => setMobileOpen(false)}
                >
                  {item.label}
                </Link>
              );
            })}
            {!isAuthenticated ? (
              <>
                <Link
                  className="min-h-11 rounded-md px-3 py-3 text-sm font-medium text-on-surface-variant transition-colors hover:bg-surface-high hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:hidden"
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                >
                  Login
                </Link>
                <Link
                  className="min-h-11 rounded-md px-3 py-3 text-sm font-semibold text-primary transition-colors hover:bg-primary-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary md:hidden"
                  href="/register"
                  onClick={() => setMobileOpen(false)}
                >
                  Create account
                </Link>
              </>
            ) : null}
          </nav>
        </Dialog>
      </div>
    </>
  );
}
