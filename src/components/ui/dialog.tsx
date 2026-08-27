"use client";

import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";

import { Button } from "@/components/ui/button";

export function Dialog({
  open,
  onOpenChange,
  title,
  children,
  dismissible = true,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
  dismissible?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      className="m-auto w-[min(92vw,640px)] rounded-lg border border-workspace-border bg-surface-lowest p-0 text-on-surface backdrop:bg-[var(--overlay)]"
      onCancel={(event) => {
        if (!dismissible) event.preventDefault();
        else onOpenChange(false);
      }}
      onClose={() => {
        if (dismissible) onOpenChange(false);
      }}
      ref={ref}
    >
      <div className="flex items-center justify-between border-b border-workspace-separator px-5 py-3">
        <h2 className="font-semibold">{title}</h2>
        {dismissible ? (
          <Button
            aria-label="Close dialog"
            onClick={() => onOpenChange(false)}
            size="sm"
            variant="ghost"
          >
            <X className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
      <div className="p-5">{children}</div>
    </dialog>
  );
}
