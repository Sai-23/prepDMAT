import type { ReactNode, Ref } from "react";

import { cn } from "@/lib/utils";

export function AssessmentShell({
  actions,
  children,
  className,
  contentClassName,
  contentRef,
  header,
}: {
  actions: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  contentRef?: Ref<HTMLDivElement>;
  header: ReactNode;
}) {
  return (
    <section
      className={cn(
        "flex h-[calc(100dvh-5rem)] min-h-0 w-full flex-col overflow-hidden",
        className,
      )}
      data-focused-assessment
      data-testid="assessment-shell"
    >
      <div className="shrink-0">{header}</div>
      <div
        className={cn(
          "min-h-0 flex-1 overflow-y-auto overscroll-contain py-4",
          contentClassName,
        )}
        data-assessment-scroll-region
        ref={contentRef}
        tabIndex={-1}
      >
        {children}
      </div>
      {actions}
    </section>
  );
}

export function AssessmentActionZone({
  primary,
  secondary,
  status,
  tertiary,
}: {
  primary: ReactNode;
  secondary?: ReactNode;
  status?: ReactNode;
  tertiary?: ReactNode;
}) {
  return (
    <footer
      className="shrink-0 border-t border-workspace-separator bg-surface-lowest/98 px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(0,0,0,0.06)] backdrop-blur sm:px-4"
      data-assessment-action-zone
      data-testid="assessment-action-zone"
    >
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="flex min-h-6 min-w-0 flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {tertiary}
          {status}
        </div>
        <div className="grid shrink-0 grid-cols-2 gap-2 sm:flex sm:justify-end">
          {secondary ?? <span aria-hidden="true" />}
          {primary}
        </div>
      </div>
    </footer>
  );
}
