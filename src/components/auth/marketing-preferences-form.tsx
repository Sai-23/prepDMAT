"use client";

import { useActionState } from "react";

import { saveMarketingPreferencesAction, type AuthActionState } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";

const initialState: AuthActionState = { status: "idle" };

export function MarketingPreferencesForm({
  emailOptIn,
  hasEmail,
}: {
  emailOptIn: boolean;
  hasEmail: boolean;
}) {
  const [state, action, pending] = useActionState(saveMarketingPreferencesAction, initialState);
  return (
    <form action={action} className="space-y-5">
      <label className="flex cursor-pointer items-start gap-3 text-sm leading-6 text-on-surface-variant">
        <input
          className="mt-1 size-4 shrink-0 accent-primary"
          defaultChecked={emailOptIn}
          disabled={!hasEmail}
          name="marketingEmailOptIn"
          type="checkbox"
        />
        <span>
          Send me dMAT preparation tips, product updates, and important PrepDMAT news by email.
          {!hasEmail ? " Link an email before enabling this preference." : ""}
        </span>
      </label>
      {state.message ? (
        <p
          className={state.status === "error" ? "text-sm text-error" : "text-sm text-success"}
          role={state.status === "error" ? "alert" : "status"}
        >
          {state.message}
        </p>
      ) : null}
      <Button disabled={pending} type="submit" variant="outline">
        {pending ? "Saving..." : "Save marketing preferences"}
      </Button>
    </form>
  );
}
