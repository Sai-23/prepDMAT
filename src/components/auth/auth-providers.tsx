"use client";

import { type ReactNode, useActionState, useRef } from "react";

import {
  googleSignInAction,
  type AuthActionState,
} from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import type { AuthProviderAvailability } from "@/lib/auth/config";

const initialAuthState: AuthActionState = { status: "idle" };

function ActionMessage({ state }: { state: AuthActionState }) {
  return state.message ? (
    <p
      className={state.status === "error"
        ? "rounded-md bg-error-container p-3 text-sm text-error-container-foreground"
        : "rounded-md bg-success-container p-3 text-sm text-success-container-foreground"}
      role={state.status === "error" ? "alert" : "status"}
    >
      {state.message}
    </p>
  ) : null;
}

function GoogleButton() {
  const inFlight = useRef(false);
  const [state, action, pending] = useActionState(async (
    previousState: AuthActionState,
    formData: FormData,
  ) => {
    if (inFlight.current) return previousState;
    inFlight.current = true;
    try {
      return await googleSignInAction(previousState, formData);
    } finally {
      inFlight.current = false;
    }
  }, initialAuthState);
  return (
    <form action={action} className="space-y-2">
      <Button className="min-h-11 w-full" disabled={pending} type="submit" variant="outline">
        <GoogleMark />
        {pending ? "Redirecting to Google..." : "Continue with Google"}
      </Button>
      <ActionMessage state={state} />
    </form>
  );
}

function GoogleMark() {
  return (
    <svg aria-hidden="true" className="size-5 shrink-0" viewBox="0 0 24 24">
      <path d="M21.6 12.23c0-.71-.06-1.23-.2-1.78H12v3.4h5.52a4.76 4.76 0 0 1-2.05 3.03l-.02.11 2.98 2.3.2.02c1.86-1.71 2.97-4.23 2.97-7.08Z" fill="#4285F4" />
      <path d="M12 22c2.68 0 4.92-.88 6.56-2.39l-3.16-2.43c-.85.58-1.99.99-3.4.99a5.9 5.9 0 0 1-5.58-4.08l-.1.01-3.1 2.4-.04.1A9.9 9.9 0 0 0 12 22Z" fill="#34A853" />
      <path d="M6.42 14.09A6.13 6.13 0 0 1 6.1 12c0-.73.13-1.43.31-2.09V9.8L3.28 7.36l-.1.05A10 10 0 0 0 2 12c0 1.65.4 3.21 1.18 4.59l3.24-2.5Z" fill="#FBBC05" />
      <path d="M12 5.83c1.86 0 3.13.8 3.86 1.47l2.77-2.7C16.91 3.01 14.68 2 12 2a9.9 9.9 0 0 0-8.82 5.41l3.23 2.5A5.92 5.92 0 0 1 12 5.83Z" fill="#EA4335" />
    </svg>
  );
}

export function AuthProviderOptions({
  availability,
  emailForm,
  compact = false,
}: {
  availability: AuthProviderAvailability;
  emailForm: ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={compact ? "space-y-3" : "space-y-5"}>
      {availability.google ? <GoogleButton /> : null}
      {availability.google ? <AuthDivider /> : null}
      {emailForm}
    </div>
  );
}

export function AuthDivider() {
  return (
    <div className="flex items-center gap-3" role="separator">
      <span className="h-px flex-1 bg-workspace-separator" />
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">or</span>
      <span className="h-px flex-1 bg-workspace-separator" />
    </div>
  );
}
