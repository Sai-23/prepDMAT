"use client";

import type { Route } from "next";
import Link from "next/link";
import { Eye, EyeOff, MailCheck } from "lucide-react";
import { useActionState, useState } from "react";

import { resendVerificationAction, type AuthActionState } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";

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

function ResendVerificationForm({ email }: { email: string }) {
  const [state, action, pending] = useActionState(resendVerificationAction, initialAuthState);
  return (
    <form action={action} className="space-y-3">
      <input name="email" type="hidden" value={email} />
      <Button className="min-h-11 w-full" disabled={pending} type="submit" variant="outline">
        {pending ? "Sending email..." : "Resend email"}
      </Button>
      {state.message ? (
        <p
          className={state.status === "error" ? "text-sm text-error" : "text-sm text-success"}
          role={state.status === "error" ? "alert" : "status"}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

function CheckEmail({ email, message }: { email: string; message: string }) {
  return (
    <div className="space-y-6 text-center">
      <MailCheck aria-hidden="true" className="mx-auto size-11 text-primary" />
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-on-surface">Check your email</h2>
        <p className="text-sm leading-6 text-muted-foreground">{message}</p>
        <p className="break-all text-sm font-semibold text-on-surface">{email}</p>
      </div>
      <ResendVerificationForm email={email} />
      <Link
        className="inline-flex min-h-11 items-center justify-center text-sm font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        href="/register"
      >
        Change email
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
    return <CheckEmail email={state.email} message={state.message ?? "Confirm your email to continue."} />;
  }

  return (
    <form action={formAction} className="space-y-5" noValidate>
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
