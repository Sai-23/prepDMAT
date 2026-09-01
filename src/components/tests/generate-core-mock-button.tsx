"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

import { generateCoreMockForCurrentUser } from "@/app/tests/actions";
import { Button } from "@/components/ui/button";

type GenerationState = "idle" | "generating" | "ready" | "failed";

export function GenerateCoreMockButton() {
  const router = useRouter();
  const requestId = useRef<string | null>(null);
  const [state, setState] = useState<GenerationState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const generate = () => {
    requestId.current ??= crypto.randomUUID();
    setState("generating");
    setError(null);
    startTransition(async () => {
      const result = await generateCoreMockForCurrentUser({
        generationRequestId: requestId.current,
      });
      if (result.state === "ready") {
        setState("ready");
        router.push(`/tests/${result.mockId}/take?attempt=${result.attemptId}` as Route);
        return;
      }
      if (result.state === "generating") {
        setState("generating");
        setError("Your existing request is still generating. Wait briefly, then retry this request.");
        return;
      }
      setState("failed");
      setError(result.error);
      requestId.current = null;
    });
  };

  return (
    <div className="space-y-3">
      <Button className="w-full sm:w-auto" disabled={pending || state === "ready"} onClick={generate}>
        {state === "generating" || pending
          ? "Preparing your Core mock…"
          : state === "ready"
            ? "Mock ready — opening…"
            : state === "failed"
              ? "Try again"
              : "Start a new full Core mock"}
      </Button>
      {state === "generating" ? (
        <p className="text-sm text-on-surface-variant" role="status">
          This normally takes several seconds. Keep this page open while your mock is prepared.
        </p>
      ) : null}
      {error ? <p className="text-sm text-error" role="alert">{error}</p> : null}
    </div>
  );
}
