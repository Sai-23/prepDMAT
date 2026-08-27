"use client";

import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Eye, EyeOff, LoaderCircle, MailCheck } from "lucide-react";
import { useActionState, useEffect, useState } from "react";

import { resendVerificationAction, type AuthActionState } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { maskEmailAddress } from "@/lib/auth/email-verification";
import { startVerificationMonitor } from "@/lib/auth/verification-monitor";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

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
};

const initialAuthState: AuthActionState = { status: "idle" };

function PasswordInput({
  field,
  describedBy,
  invalid,
}: {
  field: Field;
  describedBy: string;
  invalid: boolean;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input
        aria-describedby={describedBy}
        aria-invalid={invalid}
        autoComplete={field.autoComplete}
        className="h-12 w-full rounded-md border border-input-border bg-input-background px-4 pr-12 text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-muted"
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
        {visible ? <EyeOff aria-hidden="true" className="size-5" /> : <Eye aria-hidden="true" className="size-5" />}
      </button>
    </div>
  );
}

function ResendVerificationForm({
  email,
  initialCooldown = 0,
}: {
  email?: string;
  initialCooldown?: number;
}) {
  const [cooldown, setCooldown] = useState(initialCooldown);
  const [state, action, pending] = useActionState(async (
    previousState: AuthActionState,
    formData: FormData,
  ) => {
    const nextState = await resendVerificationAction(previousState, formData);
    if (nextState.status === "success") {
      setCooldown(nextState.retryAfterSeconds ?? 60);
    }
    return nextState;
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
          ? "Sending email..."
          : cooldown > 0
            ? `Resend available in ${cooldown}s`
            : "Resend email"}
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

export function CheckEmail({ email, message }: { email: string; message: string }) {
  const router = useRouter();
  const [verificationState, setVerificationState] = useState<
    "checking" | "waiting" | "timed_out" | "verified"
  >("checking");

  useEffect(() => {
    // Client Components are also prerendered by Next.js. Instantiate the
    // cookie-backed browser client only after the component reaches a browser.
    const supabase = createSupabaseBrowserClient();
    return startVerificationMonitor({
      checkAuthenticated: async () => {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        return Boolean(user);
      },
      subscribeToAuthChanges: (notify) => {
        const { data } = supabase.auth.onAuthStateChange(() => {
          // Do not call another Supabase Auth method from inside its callback.
          window.setTimeout(notify, 0);
        });
        return () => data.subscription.unsubscribe();
      },
      onCheckingChange: (checking) => {
        setVerificationState((current) => current === "verified" || current === "timed_out"
          ? current
          : checking ? "checking" : "waiting");
      },
      onTimeout: () => setVerificationState("timed_out"),
      onVerified: () => setVerificationState("verified"),
    });
  }, []);

  useEffect(() => {
    if (verificationState !== "verified") return;
    const timer = window.setTimeout(() => {
      router.replace("/dashboard");
    }, 900);
    return () => window.clearTimeout(timer);
  }, [router, verificationState]);

  return (
    <div className="space-y-6 text-center">
      {verificationState === "verified" ? (
        <CheckCircle2 aria-hidden="true" className="mx-auto size-11 text-success" />
      ) : (
        <MailCheck aria-hidden="true" className="mx-auto size-11 text-primary" />
      )}
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-on-surface">
          {verificationState === "verified"
            ? "Email verified"
            : verificationState === "timed_out"
              ? "Still waiting?"
              : "Check your email"}
        </h2>
        <p className="text-sm leading-6 text-muted-foreground">
          {verificationState === "verified"
            ? "You're all set."
            : verificationState === "timed_out"
              ? "Already confirmed on another device? Sign in to continue on this device."
              : message}
        </p>
        {verificationState === "verified" ? null : (
          <p className="text-sm leading-6 text-muted-foreground">
            If you open the link in this browser, we&apos;ll continue automatically.
          </p>
        )}
        <p className="break-all text-sm font-semibold text-on-surface">
          {maskEmailAddress(email)}
        </p>
        <p className="flex min-h-6 items-center justify-center gap-2 text-xs text-muted-foreground" role="status">
          {verificationState === "checking" ? (
            <>
              <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
              Checking verification…
            </>
          ) : verificationState === "verified" ? (
            "Taking you to your dashboard…"
          ) : verificationState === "timed_out" ? (
            "Automatic checking has stopped"
          ) : (
            "Waiting for verification"
          )}
        </p>
      </div>
      {verificationState === "verified" ? null : (
        <ResendVerificationForm email={email} initialCooldown={60} />
      )}
      {verificationState === "timed_out" ? (
        <Button asChild className="min-h-11 w-full">
          <Link href="/login">Sign in to continue</Link>
        </Button>
      ) : null}
      {verificationState === "verified" ? null : <a
        className="inline-flex min-h-11 items-center justify-center text-sm font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        href="/register"
      >
        Change email
      </a>}
    </div>
  );
}

export function VerificationRecovery() {
  return (
    <div className="mb-5 space-y-4 rounded-md bg-error-container p-4 text-error-container-foreground">
      <div className="space-y-1">
        <p className="font-semibold">Verification link expired</p>
        <p className="text-sm">This link may have expired or already been used.</p>
      </div>
      <ResendVerificationForm />
      <Link
        className="inline-flex min-h-11 w-full items-center justify-center text-sm font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        href="/login"
      >
        Sign in
      </Link>
    </div>
  );
}

export function AuthForm({
  action,
  fields,
  submitLabel,
  pendingLabel,
  footer,
  forgotPassword,
  marketingConsent,
}: AuthFormProps) {
  const [state, formAction, pending] = useActionState(action, initialAuthState);

  if (state.status === "success" && state.view === "check_email" && state.email) {
    return <CheckEmail email={state.email} message={state.message ?? "Confirm your email to finish creating your account."} />;
  }

  return (
    <form action={formAction} className="space-y-5" id="email-sign-in" noValidate>
      {fields.map((field) => {
        const errorId = `${field.name}-error`;
        const helpId = field.name === "password" && field.autoComplete === "new-password"
          ? "password-requirements"
          : null;
        const describedBy = [helpId, state.errors?.[field.name] ? errorId : null]
          .filter(Boolean)
          .join(" ");
        return (
          <div className="space-y-2" key={field.name}>
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
                describedBy={describedBy}
                field={field}
                invalid={Boolean(state.errors?.[field.name])}
              />
            ) : (
              <input
                aria-describedby={describedBy || undefined}
                aria-invalid={Boolean(state.errors?.[field.name])}
                autoComplete={field.autoComplete}
                className="h-12 w-full rounded-md border border-input-border bg-input-background px-4 text-on-surface outline-none transition placeholder:text-input-placeholder focus:border-primary focus:ring-2 focus:ring-primary-muted"
                id={field.name}
                name={field.name}
                placeholder={field.placeholder}
                type={field.type}
              />
            )}
            {helpId ? (
              <p className="text-xs leading-5 text-muted-foreground" id={helpId}>
                At least 8 characters, including a letter and a number.
              </p>
            ) : null}
            {state.errors?.[field.name]?.map((error) => (
              <p className="text-sm text-error" id={errorId} key={error}>
                {error}
              </p>
            ))}
          </div>
        );
      })}

      {marketingConsent ? (
        <label className="flex cursor-pointer items-start gap-3 text-sm leading-6 text-on-surface-variant">
          <input
            className="mt-1 size-4 shrink-0 accent-primary"
            name="marketingEmailOptIn"
            type="checkbox"
          />
          <span>Send me dMAT preparation tips, product updates, and important dMATPrep news.</span>
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
