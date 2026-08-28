import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ActionError({
  action,
  className,
  description,
  title,
}: {
  action?: { label?: string; onClick(): void; disabled?: boolean };
  className?: string;
  description: string;
  title: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-lg border border-error/40 bg-error-container/70 p-4 text-error-container-foreground sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
      role="alert"
    >
      <div className="flex min-w-0 items-start gap-3">
        <AlertTriangle aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-error" />
        <div className="min-w-0">
          <p className="font-semibold">{title}</p>
          <p className="mt-1 text-sm leading-6">{description}</p>
        </div>
      </div>
      {action ? (
        <Button
          className="min-h-11 shrink-0"
          disabled={action.disabled}
          onClick={action.onClick}
          type="button"
          variant="outline"
        >
          <RotateCcw aria-hidden="true" className="h-4 w-4" />
          {action.label ?? "Try again"}
        </Button>
      ) : null}
    </div>
  );
}
