"use client";

import { ChevronDown, Phone } from "lucide-react";
import { useActionState, useEffect, useState } from "react";

import {
  googleSignInAction,
  requestPhoneOtpAction,
  verifyPhoneOtpAction,
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
  const [state, action, pending] = useActionState(googleSignInAction, initialAuthState);
  return (
    <form action={action} className="space-y-2">
      <Button className="min-h-11 w-full" disabled={pending} type="submit" variant="outline">
        <span aria-hidden="true" className="text-base font-bold text-on-surface">G</span>
        {pending ? "Redirecting to Google..." : "Continue with Google"}
      </Button>
      <ActionMessage state={state} />
    </form>
  );
}

function ResendPhoneCode({ phone }: { phone: string }) {
  const [seconds, setSeconds] = useState(60);
  const [state, action, pending] = useActionState(
    async (previousState: AuthActionState, formData: FormData) => {
      const nextState = await requestPhoneOtpAction(previousState, formData);
      if (nextState.status === "success") {
        setSeconds(nextState.retryAfterSeconds ?? 60);
      }
      return nextState;
    },
    initialAuthState,
  );

  useEffect(() => {
    if (seconds <= 0) return;
    const timer = window.setInterval(() => setSeconds((current) => Math.max(0, current - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [seconds]);

  return (
    <form action={action} className="space-y-2">
      <input name="countryCode" type="hidden" value="+91" />
      <input name="phone" type="hidden" value={phone} />
      <button
        className="min-h-11 text-sm font-semibold text-primary enabled:hover:underline disabled:text-muted-foreground"
        disabled={pending || seconds > 0}
        type="submit"
      >
        {pending ? "Sending code..." : seconds > 0 ? `Resend code in ${seconds}s` : "Resend code"}
      </button>
      <ActionMessage state={state} />
    </form>
  );
}

function VerifyPhoneCode({ phone, onChangeNumber }: { phone: string; onChangeNumber: () => void }) {
  const [state, action, pending] = useActionState(verifyPhoneOtpAction, initialAuthState);
  return (
    <div className="space-y-4">
      <p className="text-sm leading-6 text-muted-foreground">
        Enter the code sent to <span className="font-semibold text-on-surface">{phone}</span>.
      </p>
      <form action={action} className="space-y-4" noValidate>
        <input name="phone" type="hidden" value={phone} />
        <div className="space-y-2">
          <label className="text-sm font-semibold text-on-surface" htmlFor="phone-token">
            Verification code
          </label>
          <input
            aria-describedby={state.errors?.token ? "phone-token-error" : undefined}
            aria-invalid={Boolean(state.errors?.token)}
            autoComplete="one-time-code"
            className="h-12 w-full rounded-md border border-input-border bg-input-background px-4 text-center font-mono text-xl tracking-[0.35em] text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary-muted"
            id="phone-token"
            inputMode="numeric"
            maxLength={6}
            name="token"
            pattern="[0-9]*"
            type="text"
          />
          {state.errors?.token?.map((error) => (
            <p className="text-sm text-error" id="phone-token-error" key={error}>{error}</p>
          ))}
        </div>
        <ActionMessage state={state} />
        <Button className="min-h-11 w-full" disabled={pending} type="submit">
          {pending ? "Verifying..." : "Verify code"}
        </Button>
      </form>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ResendPhoneCode phone={phone} />
        <button
          className="min-h-11 text-sm font-semibold text-primary hover:underline"
          onClick={onChangeNumber}
          type="button"
        >
          Change number
        </button>
      </div>
    </div>
  );
}

function PhoneEntry({ onCodeSent }: { onCodeSent: (phone: string) => void }) {
  const [state, action, pending] = useActionState(
    async (previousState: AuthActionState, formData: FormData) => {
      const nextState = await requestPhoneOtpAction(previousState, formData);
      if (nextState.status === "success" && nextState.view === "phone_code" && nextState.phone) {
        onCodeSent(nextState.phone);
      }
      return nextState;
    },
    initialAuthState,
  );

  return (
    <form action={action} className="space-y-4" noValidate>
      <div className="space-y-2">
        <label className="text-sm font-semibold text-on-surface" htmlFor="phone-number">Phone number</label>
        <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-2">
          <select
            aria-label="Country code"
            className="h-12 rounded-md border border-input-border bg-input-background px-3 text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary-muted"
            defaultValue="+91"
            name="countryCode"
          >
            <option value="+91">India +91</option>
            <option value="+1">US/CA +1</option>
            <option value="+44">UK +44</option>
            <option value="+971">UAE +971</option>
            <option value="+65">SG +65</option>
          </select>
          <input
            aria-describedby={state.errors?.phone ? "phone-number-error" : "phone-help"}
            aria-invalid={Boolean(state.errors?.phone)}
            autoComplete="tel"
            className="h-12 min-w-0 rounded-md border border-input-border bg-input-background px-3 text-on-surface outline-none placeholder:text-input-placeholder focus:border-primary focus:ring-2 focus:ring-primary-muted"
            id="phone-number"
            inputMode="tel"
            name="phone"
            placeholder="98765 43210"
            type="tel"
          />
        </div>
        <p className="text-xs leading-5 text-muted-foreground" id="phone-help">
          Standard SMS rates may apply. This number is used for account verification only.
        </p>
        {state.errors?.phone?.map((error) => (
          <p className="text-sm text-error" id="phone-number-error" key={error}>{error}</p>
        ))}
      </div>
      <ActionMessage state={state} />
      <Button className="min-h-11 w-full" disabled={pending} type="submit">
        {pending ? "Sending code..." : "Send code"}
      </Button>
    </form>
  );
}

function PhonePanel() {
  const [phone, setPhone] = useState<string | null>(null);
  return phone
    ? <VerifyPhoneCode onChangeNumber={() => setPhone(null)} phone={phone} />
    : <PhoneEntry onCodeSent={setPhone} />;
}

export function AuthProviderOptions({ availability }: { availability: AuthProviderAvailability }) {
  const [phoneOpen, setPhoneOpen] = useState(false);
  if (!availability.google && !availability.phone) return null;

  return (
    <div className="space-y-3">
      {availability.google ? <GoogleButton /> : null}
      {availability.phone ? (
        <div className="space-y-3">
          <Button
            aria-expanded={phoneOpen}
            className="min-h-11 w-full"
            onClick={() => setPhoneOpen((current) => !current)}
            type="button"
            variant="outline"
          >
            <Phone aria-hidden="true" className="size-4" />
            Continue with Phone
            <ChevronDown aria-hidden="true" className={`ml-auto size-4 transition ${phoneOpen ? "rotate-180" : ""}`} />
          </Button>
          {phoneOpen ? (
            <div className="rounded-md border border-workspace-border bg-surface-low p-4">
              <PhonePanel />
            </div>
          ) : null}
        </div>
      ) : null}
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
