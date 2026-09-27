import type { ReactNode } from "react";

import { WorkspaceShell } from "@/components/layout/workspace-shell";
import { Badge } from "@/components/ui/badge";
import type { UserRole } from "@/types/auth";

type PageShellProps = {
  eyebrow: string;
  title: string;
  description?: string;
  children: ReactNode;
  admin?: boolean;
  roles?: UserRole[];
  compact?: boolean;
  hideHeading?: boolean;
};

export function PageShell({
  eyebrow,
  title,
  description,
  children,
  admin = false,
  roles = [],
  compact = false,
  hideHeading = false,
}: PageShellProps) {
  return (
    <WorkspaceShell
      admin={admin}
      compact={compact}
      roles={roles}
      heading={hideHeading ? undefined : (
        <div className="space-y-3">
          <Badge variant="subtle">{eyebrow}</Badge>
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-on-surface">
              {title}
            </h1>
            {description ? (
              <p className="max-w-3xl text-sm leading-6 text-on-surface-variant">
                {description}
              </p>
            ) : null}
          </div>
        </div>
      )}
    >
      {children}
    </WorkspaceShell>
  );
}
