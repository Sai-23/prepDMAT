"use client";

import type { Route } from "next";
import Link from "next/link";
import { CheckCircle2, Eye, EyeOff, MailCheck } from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";

import {
  resendVerificationAction,
  verifyRegistrationEmailOtpAction,
  type AuthActionState,
} from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { maskEmailAddress } from "@/lib/auth/email-verification";

type Field = {
  name: string;
  label: string;
  type: "text" | "email" | "password";
  autoComplete: string;
  placeholder?: string;
};

type AuthFormProps = {
  action: (state: AuthActionState, formData: FormData) => Promise<AuthActionState>;
  fields: Field[];
  submitLabel: string;
  pendingLabel: string;
  footer?: { text: string; label: string; href: Route };
  forgotPassword?: boolean;
  marketingConsent?: boolean;
  compact?: boolean;
};

const initialAuthState: AuthActionState = { status: "idle" };

function PasswordInput({
  field,
  describedBy,
  invalid,
  compact,
}: {
  field: Field;
  describedBy: string;
  invalid: boolean;
  compact: boolean;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input
        aria-describedby={describedBy}
        aria-invalid={invalid}
        autoComplete={field.autoComplete}
        className={`${compact ? "h-11" : "h-12"} w-full rounded-md border border-input-border bg-input-background px-4 pr-12 text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-muted`}
        id={field.name}
        name={field.name}
        type={visible ? "text" : "password"}
      />
      <button
        aria-label={`${visible ? "Hide" : "Show"} ${field.label.toLowerCase()}`}
        className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-md text-muted-foreground hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
        onClick={() => setVisible((current) => !current)}
        type="button"
      >
        {visible
          ? <EyeOff aria-hidden="true" className="size-5" />
          : <Eye aria-hidden="true" className="size-5" />}
      </button>
    </div>
  );
}

function ResendVerificationForm({
  email,
  initialCooldown = 0,
  onSent,
}: {
  email?: string;
  initialCooldown?: number;
  onSent?: (email: string) => void;
}) {
  const [cooldown, setCooldown] = useState(initialCooldown);
  const inFlight = useRef(false);
  const [state, action, pending] = useActionState(async (
    previousState: AuthActionState,
    formData: FormData,
  ) => {
    if (inFlight.current) return previousState;
    inFlight.current = true;
    try {
      const nextState = await resendVerificationAction(previousState, formData);
      if (nextState.status === "success") {
        setCooldown(nextState.retryAfterSeconds ?? 60);
        const submittedEmail = formData.get("email");
        if (typeof submittedEmail === "string") onSent?.(submittedEmail);
      }
      return nextState;
    } finally {
      inFlight.current = false;
    }
  }, initialAuthState);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => {
      setCooldown((current) => Math.max(0, current - 1));
    }, 1_000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  const unavailable = pending || cooldown > 0;
  return (
    <form action={action} className="space-y-3">
      {email ? (
        <input name="email" type="hidden" value={email} />
      ) : (
        <div className="space-y-2 text-left">
          <label className="text-sm font-semibold text-on-surface" htmlFor="verification-email">
            Email
          </label>
          <input
            autoComplete="email"
            className="h-12 w-full rounded-md border border-input-border bg-input-background px-4 text-on-surface outline-none transition placeholder:text-input-placeholder focus:border-primary focus:ring-2 focus:ring-primary-muted"
            id="verification-email"
            name="email"
            placeholder="you@example.com"
            type="email"
          />
        </div>
      )}
      <Button className="min-h-11 w-full" disabled={unavailable} type="submit" variant="outline">
        {pending
          ? "Sending code..."
          : cooldown > 0
            ? `Resend code in 00:${String(cooldown).padStart(2, "0")}`
            : "Resend code"}
      </Button>
      {state.message ? (
        <p
          className={state.status === "error"
            ? "text-sm text-error"
            : "flex items-center justify-center gap-2 text-sm text-success"}
          role={state.status === "error" ? "alert" : "status"}
        >
          {state.status === "success" ? <CheckCircle2 aria-hidden="true" className="size-4" /> : null}
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

export function EmailVerificationOtp({
  email,
  message,
  onChangeEmail,
}: {
  email: string;
  message?: string;
  onChangeEmail?: () => void;
}) {
  const [token, setToken] = useState("");
  const inFlight = useRef(false);
  const [state, action, pending] = useActionState(async (
    previousState: AuthActionState,
    formData: FormData,
  ) => {
    if (inFlight.current) return previousState;
    inFlight.current = true;
    try {
      return await verifyRegistrationEmailOtpAction(previousState, formData);
    } finally {
      inFlight.current = false;
    }
  }, initialAuthState);
  const complete = /^\d{6}$/.test(token);

  return (
    <div className="space-y-5 text-center">
      <MailCheck aria-hidden="true" className="mx-auto size-10 text-primary" />
      <div className="space-y-1.5">
        <h2 className="text-xl font-semibold text-on-surface">Verify your email</h2>
        <p className="text-sm leading-6 text-muted-foreground">
          {message ?? "Enter the 6-digit code sent to:"}
        </p>
        <p className="break-all text-sm font-semibold text-on-surface">
          {maskEmailAddress(email)}
        </p>
      </div>
      <form action={action} className="space-y-4 text-left" noValidate>
        <input name="email" type="hidden" value={email} />
        <div className="space-y-2">
          <label className="text-sm font-semibold text-on-surface" htmlFor="email-verification-token">
            Verification code
          </label>
          <input
            aria-describedby={state.errors?.token ? "email-verification-token-error" : undefined}
            aria-invalid={Boolean(state.errors?.token)}
            autoComplete="one-time-code"
            autoFocus
            className="h-12 w-full rounded-md border border-input-border bg-input-background px-4 text-center font-mono text-xl tracking-[0.35em] text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-muted"
            id="email-verification-token"
            inputMode="numeric"
            maxLength={6}
            name="token"
            onChange={(event) => setToken(event.target.value.replace(/\D/g, "").slice(0, 6))}
            pattern="[0-9]{6}"
            type="text"
            value={token}
          />
          {state.errors?.token?.map((error) => (
            <p className="text-sm text-error" id="email-verification-token-error" key={error} role="alert">
              {error}
            </p>
          ))}
        </div>
        {state.message ? (
          <p className="rounded-md bg-error-container p-3 text-sm text-error-container-foreground" role="alert">
            {state.message}
          </p>
        ) : null}
        <Button className="min-h-11 w-full" disabled={pending || !complete} type="submit">
          {pending ? "Verifying..." : "Verify email"}
        </Button>
      </form>
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">Didn&apos;t receive the code?</p>
        <ResendVerificationForm email={email} initialCooldown={60} />
      </div>
      <button
        className="inline-flex min-h-11 items-center justify-center text-sm font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        onClick={onChangeEmail}
        type="button"
      >
        Use a different email
      </button>
    </div>
  );
}

export function VerificationRecovery() {
  const [email, setEmail] = useState<string | null>(null);
  if (email) {
    return <EmailVerificationOtp email={email} message="Enter the verification code we sent to:" />;
  }

  return (
    <div className="mb-5 space-y-4 rounded-md bg-error-container p-4 text-error-container-foreground">
      <div className="space-y-1">
        <p className="font-semibold">Verification link expired</p>
        <p className="text-sm">Request a new verification code to continue.</p>
      </div>
      <ResendVerificationForm onSent={setEmail} />
      <Link
        className="inline-flex min-h-11 w-full items-center justify-center text-sm font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        href="/login"
      >
        Sign in
      </Link>
    </div>
  );
}

function AuthFormState({
  action,
  fields,
  submitLabel,
  pendingLabel,
  footer,
  forgotPassword,
  marketingConsent,
  compact = false,
  onReset,
}: AuthFormProps & { onReset: () => void }) {
  const inFlight = useRef(false);
  const [state, formAction, pending] = useActionState(async (
    previousState: AuthActionState,
    formData: FormData,
  ) => {
    if (inFlight.current) return previousState;
    inFlight.current = true;
    try {
      return await action(previousState, formData);
    } finally {
      inFlight.current = false;
    }
  }, initialAuthState);

  if (state.view === "verify_email" && state.email) {
    return <EmailVerificationOtp email={state.email} message={state.message} onChangeEmail={onReset} />;
  }

  return (
    <form action={formAction} className={compact ? "space-y-3" : "space-y-4"} id="email-sign-in" noValidate>
      {fields.map((field) => {
        const errorId = `${field.name}-error`;
        const helpId = field.name === "password" && field.autoComplete === "new-password"
          ? "password-requirements"
          : null;
        const describedBy = [helpId, state.errors?.[field.name] ? errorId : null]
          .filter(Boolean)
          .join(" ");
        return (
          <div className={compact ? "space-y-1" : "space-y-1.5"} key={field.name}>
            <div className="flex items-center justify-between gap-4">
              <label className="text-sm font-semibold text-on-surface" htmlFor={field.name}>
                {field.label}
              </label>
              {forgotPassword && field.name === "password" ? (
                <Link
                  className="text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  href="/forgot-password"
                >
                  Forgot password?
                </Link>
              ) : null}
            </div>
            {field.type === "password" ? (
              <PasswordInput
                compact={compact}
                describedBy={describedBy}
                field={field}
                invalid={Boolean(state.errors?.[field.name])}
              />
            ) : (
              <input
                aria-describedby={describedBy || undefined}
                aria-invalid={Boolean(state.errors?.[field.name])}
                autoComplete={field.autoComplete}
                autoFocus={field.name === "email"}
                className={`${compact ? "h-11" : "h-12"} w-full rounded-md border border-input-border bg-input-background px-4 text-on-surface outline-none transition placeholder:text-input-placeholder focus:border-primary focus:ring-2 focus:ring-primary-muted`}
                id={field.name}
                name={field.name}
                placeholder={field.placeholder}
                type={field.type}
              />
            )}
            {helpId ? (
              <p className="text-xs leading-5 text-muted-foreground" id={helpId}>
                8+ characters with a letter and number.
              </p>
            ) : null}
            {state.errors?.[field.name]?.map((error) => (
              <p className="text-sm text-error" id={errorId} key={error} role="alert">
                {error}
              </p>
            ))}
          </div>
        );
      })}

      {marketingConsent ? (
        <label className="flex cursor-pointer items-start gap-3 text-sm leading-5 text-on-surface-variant">
          <input
            className="mt-1 size-4 shrink-0 accent-primary"
            name="marketingEmailOptIn"
            type="checkbox"
          />
          <span>Send me useful PrepDMAT updates.</span>
        </label>
      ) : null}

      {state.message ? (
        <div
          className={state.status === "success"
            ? "rounded-md bg-success-container p-3 text-sm text-success-container-foreground"
            : "rounded-md bg-error-container p-3 text-sm text-error-container-foreground"}
          role={state.status === "error" ? "alert" : "status"}
        >
          {state.message}
        </div>
      ) : null}

      <Button className="min-h-11 w-full" disabled={pending} type="submit">
        {pending ? pendingLabel : submitLabel}
      </Button>

      {footer ? (
        <p className="text-center text-sm text-muted-foreground">
          {footer.text}{" "}
          <Link
            className="font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            href={footer.href}
          >
            {footer.label}
          </Link>
        </p>
      ) : null}
    </form>
  );
}

export function AuthForm(props: AuthFormProps) {
  const [generation, setGeneration] = useState(0);
  return (
    <AuthFormState
      {...props}
      key={generation}
      onReset={() => setGeneration((current) => current + 1)}
    />
  );
}
