"use client";

import {
  Focus,
  PanelLeftClose,
  PanelLeftOpen,
  TerminalSquare,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  adminNavigation,
  navigationForRoles,
  reviewerNavigation,
  studentNavigation,
} from "@/lib/constants/navigation";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types/auth";

type AppSidebarProps = {
  admin?: boolean;
  roles?: UserRole[];
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  onZenMode: () => void;
};

export function AppSidebar({
  admin = false,
  roles = [],
  collapsed,
  onCollapsedChange,
  onZenMode,
}: AppSidebarProps) {
  const pathname = usePathname();
  const isFullAdmin = roles.includes("admin");
  const items = admin
    ? navigationForRoles(
        isFullAdmin ? adminNavigation : reviewerNavigation,
        roles,
      )
    : studentNavigation;

  return (
    <aside
      className={cn(
        "flex h-fit min-h-[420px] flex-col rounded-lg border border-workspace-border bg-sidebar-background p-2",
        collapsed
          ? "w-16"
          : "workspace-resizable w-[260px] min-w-[220px] max-w-[380px]",
      )}
    >
      <div
        className={cn(
          "flex min-h-10 items-center border-b border-workspace-separator pb-2",
          collapsed ? "justify-center" : "justify-between gap-3 px-2",
        )}
      >
        {collapsed ? (
          <TerminalSquare className="h-5 w-5 text-primary" aria-hidden="true" />
        ) : (
          <div>
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Workspace
            </p>
            <p className="mt-0.5 text-xs font-semibold text-on-surface">
              {admin
                ? isFullAdmin
                  ? "Admin console"
                  : "Reviewer console"
                : "Your preparation"}
            </p>
          </div>
        )}
        {!collapsed ? (
          <Button
            aria-label="Collapse sidebar"
            onClick={() => onCollapsedChange(true)}
            size="sm"
            title="Collapse sidebar"
            variant="ghost"
          >
            <PanelLeftClose className="h-4 w-4" />
          </Button>
        ) : null}
      </div>

      {collapsed ? (
        <Button
          aria-label="Expand sidebar"
          className="mt-2"
          onClick={() => onCollapsedChange(false)}
          size="sm"
          title="Expand sidebar"
          variant="ghost"
        >
          <PanelLeftOpen className="h-4 w-4" />
        </Button>
      ) : null}

      <nav className="mt-2 flex-1 space-y-1" aria-label="Workspace navigation">
        {items.map((item) => {
          const active =
            item.href === "/admin"
              ? pathname === item.href
              : pathname.startsWith(item.href);
          return (
            <Link
              aria-label={item.label}
              className={cn(
                "relative flex min-h-9 items-center rounded px-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                collapsed ? "justify-center" : "gap-3",
                active
                  ? "bg-sidebar-active text-primary"
                  : "text-on-surface-variant hover:bg-sidebar-hover hover:text-on-surface",
              )}
              href={item.href}
              key={item.href}
              title={collapsed ? item.label : undefined}
            >
              {active ? (
                <span className="absolute inset-y-1 left-0 w-0.5 bg-primary" />
              ) : null}
              {collapsed ? <span aria-hidden="true" className="text-xs font-semibold">{item.label.slice(0, 2)}</span> : null}
              {!collapsed ? <span>{item.label}</span> : null}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-2 border-t border-workspace-separator pt-2">
        <ThemeToggle compact={collapsed} />
        {admin ? <Button
          aria-label="Enter Zen Mode"
          className={collapsed ? "w-full px-0" : "w-full justify-start"}
          onClick={onZenMode}
          size="sm"
          title={collapsed ? "Enter Zen Mode" : undefined}
          variant="ghost"
        >
          <Focus className="h-4 w-4" />
          {!collapsed ? "Zen Mode" : null}
        </Button> : null}
      </div>
    </aside>
  );
}
