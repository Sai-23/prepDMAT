"use client";

import { useEffect } from "react";

import { ErrorState } from "@/components/shared/error-state";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error("[route.render] failed", {
      category: "unexpected_render_error",
      operation: "render",
      route: window.location.pathname,
      digest: error.digest ?? "unavailable",
    });
  }, [error]);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-16">
      <ErrorState
        title="Something went wrong"
        description="The application encountered an unexpected error while rendering this route."
      />
      <button
        type="button"
        onClick={reset}
        className="w-fit rounded-md bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
      >
        Try again
      </button>
    </div>
  );
}
