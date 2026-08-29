"use client";

import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { startPublicDiagnosticAction } from "@/app/diagnostic/actions";
import { ActionError } from "@/components/shared/action-error";
import { Button } from "@/components/ui/button";

export function PublicDiagnosticStart() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-3">
      <Button
        className="min-h-12 w-full sm:w-auto"
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await startPublicDiagnosticAction();
            if (result.error || !("destination" in result)) {
              setError(result.error ?? "Unable to start the diagnostic.");
              return;
            }
            router.push(result.destination);
          });
        }}
        size="lg"
        type="button"
      >
        {pending ? "Preparing..." : "Start free diagnostic"}
        {!pending ? <ArrowRight aria-hidden="true" className="h-4 w-4" /> : null}
      </Button>
      {error ? <ActionError description={error} title="Diagnostic unavailable" /> : null}
    </div>
  );
}

