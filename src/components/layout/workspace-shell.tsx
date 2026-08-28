"use client";

import { Focus, PanelLeftOpen } from "lucide-react";
import {
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { AppSidebar } from "@/components/layout/app-sidebar";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import type { UserRole } from "@/types/auth";

const SIDEBAR_KEY = "dmat-sidebar-collapsed";
const ZEN_KEY = "dmat-zen-mode";

export function WorkspaceShell({
  admin,
  roles,
  heading,
  children,
}: {
  admin: boolean;
  roles: UserRole[];
  heading: ReactNode;
  children: ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [zenMode, setZenMode] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setCollapsed(window.localStorage.getItem(SIDEBAR_KEY) === "true");
      setZenMode(window.localStorage.getItem(ZEN_KEY) === "true");
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_KEY, String(collapsed));
  }, [collapsed]);

  useEffect(() => {
    window.localStorage.setItem(ZEN_KEY, String(zenMode));
    document.body.classList.toggle("zen-mode", zenMode);
    return () => document.body.classList.remove("zen-mode");
  }, [zenMode]);

  return (
    <section
      className={[
        "mx-auto flex w-full gap-4 px-4 py-6 lg:px-6",
        zenMode ? "max-w-[1600px]" : "max-w-7xl",
      ].join(" ")}
      data-workspace-shell
    >
      {!zenMode ? (
        <div className="hidden shrink-0 lg:block">
          <AppSidebar
            admin={admin}
            roles={roles}
            collapsed={collapsed}
            onCollapsedChange={setCollapsed}
            onZenMode={() => setZenMode(true)}
          />
        </div>
      ) : null}
      <div className="min-w-0 flex-1 space-y-5">
        <div className="flex items-start justify-between gap-4" data-workspace-heading>
          <div className="min-w-0 flex-1">{heading}</div>
          <div className="flex shrink-0 items-center gap-2">
            <div className="lg:hidden">
              <ThemeToggle compact />
            </div>
            {zenMode ? (
              <Button
                aria-label="Exit Zen Mode"
                onClick={() => setZenMode(false)}
                size="sm"
                title="Exit Zen Mode"
                variant="outline"
              >
                <PanelLeftOpen className="h-4 w-4" />
                <span className="hidden sm:inline">Exit Zen</span>
              </Button>
            ) : (
              <Button
                aria-label="Enter Zen Mode"
                className="lg:hidden"
                onClick={() => setZenMode(true)}
                size="sm"
                title="Enter Zen Mode"
                variant="outline"
              >
                <Focus className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        {children}
      </div>
    </section>
  );
}
