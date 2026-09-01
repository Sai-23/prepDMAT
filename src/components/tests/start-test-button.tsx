"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { startTestAction } from "@/app/tests/actions";
import { Button } from "@/components/ui/button";

export function StartTestButton({
  testId,
  label = "Start or resume test",
}: {
  testId: string;
  label?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const start = () => {
    setError(null);
    startTransition(async () => {
      const result = await startTestAction(testId);
      if (!("attemptId" in result) || !result.attemptId) {
        setError(result.error ?? "Unable to start this test.");
        return;
      }

      router.push(
        `/tests/${testId}/take?attempt=${result.attemptId}` as Route,
      );
    });
  };

  return (
    <div className="space-y-3">
      <Button className="w-full" disabled={pending} onClick={start}>
        {pending ? "Preparing test..." : label}
      </Button>
      {error ? (
        <p className="text-sm text-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
