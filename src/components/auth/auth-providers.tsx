"use client";

import { Mail, Phone } from "lucide-react";
import { type ReactNode, useActionState, useEffect, useState } from "react";

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

export function maskPhoneNumber(phone: string) {
  const prefix = ["+971", "+91", "+65", "+44", "+1"]
    .find((countryCode) => phone.startsWith(countryCode)) ?? phone.slice(0, 2);
  const lastFour = phone.slice(-4);
  const hiddenLength = Math.max(4, Math.min(6, phone.length - prefix.length - lastFour.length));
  return `${prefix} ${"•".repeat(hiddenLength)}${lastFour}`;
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
        Code sent to <span className="font-semibold text-on-surface">{maskPhoneNumber(phone)}</span>
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
        <div>
          <p className="text-xs text-muted-foreground">Didn&apos;t receive the code?</p>
          <ResendPhoneCode phone={phone} />
        </div>
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

export function AuthProviderOptions({
  availability,
  emailForm,
}: {
  availability: AuthProviderAvailability;
  emailForm: ReactNode;
}) {
  const [mode, setMode] = useState<"email" | "phone">("email");
  return (
    <div className="space-y-5">
      {availability.google ? <GoogleButton /> : null}
      {availability.google ? <AuthDivider /> : null}
      {availability.phone ? <div className="space-y-4">
        <div
          aria-label="Sign-in method"
          className="grid grid-cols-2 rounded-lg bg-surface-low p-1"
          role="tablist"
        >
          <button
            aria-controls="auth-email-panel"
            aria-selected={mode === "email"}
            className={`flex min-h-11 items-center justify-center gap-2 rounded-md px-3 text-sm font-semibold transition ${mode === "email" ? "bg-surface-lowest text-on-surface shadow-sm" : "text-muted-foreground hover:text-on-surface"}`}
            id="auth-email-tab"
            onClick={() => setMode("email")}
            role="tab"
            type="button"
          >
            <Mail aria-hidden="true" className="size-4" />Email
          </button>
          <button
            aria-controls="auth-phone-panel"
            aria-selected={mode === "phone"}
            className={`flex min-h-11 items-center justify-center gap-2 rounded-md px-3 text-sm font-semibold transition ${mode === "phone" ? "bg-surface-lowest text-on-surface shadow-sm" : "text-muted-foreground hover:text-on-surface"}`}
            id="auth-phone-tab"
            onClick={() => setMode("phone")}
            role="tab"
            type="button"
          >
            <Phone aria-hidden="true" className="size-4" />Phone
          </button>
        </div>
        <div aria-labelledby="auth-email-tab" hidden={mode !== "email"} id="auth-email-panel" role="tabpanel">
          {emailForm}
        </div>
        <div aria-labelledby="auth-phone-tab" hidden={mode !== "phone"} id="auth-phone-panel" role="tabpanel">
          <PhonePanel />
        </div>
      </div> : emailForm}
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
