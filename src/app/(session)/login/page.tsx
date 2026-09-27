import { redirect } from "next/navigation";

import { loginAction } from "@/app/auth/actions";
import { AuthProviderOptions } from "@/components/auth/auth-providers";
import { AuthForm, VerificationRecovery } from "@/components/auth/auth-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAuthProviderAvailability } from "@/lib/auth/config";
import { getCurrentUser } from "@/lib/auth/guards";
import { getPostAuthRoute } from "@/lib/auth/post-auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; verification?: string }>;
}) {
  const params = await searchParams;
  const user = await getCurrentUser();
  if (user) redirect(await getPostAuthRoute(user.id));

  const availability = getAuthProviderAvailability();

  return (
    <div className="mx-auto flex w-full max-w-md px-4 py-6 sm:px-6 sm:py-10">
      <Card className="w-full">
        <CardHeader className="p-5 pb-3 sm:p-6 sm:pb-4">
          <CardTitle>Welcome back</CardTitle>
          <CardDescription>
            Sign in to continue your preparation and review your progress.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {params.error === "auth_callback" ? (
            <p className="mb-5 rounded-md bg-error-container p-3 text-sm text-error-container-foreground" role="alert">
              We could not complete automatic sign-in. Sign in or request a new verification email.
            </p>
          ) : null}
          {params.error === "auth_unavailable" ? (
            <p className="mb-5 rounded-md bg-error-container p-3 text-sm text-error-container-foreground" role="alert">
              The authentication service is temporarily unavailable. Please try again.
            </p>
          ) : null}
          {params.error === "google_unavailable" ? (
            <p className="mb-5 rounded-md bg-error-container p-3 text-sm text-error-container-foreground" role="alert">
              Google sign-in is temporarily unavailable. Please try again.
            </p>
          ) : null}
          {params.error === "google_expired" ? (
            <p className="mb-5 rounded-md bg-error-container p-3 text-sm text-error-container-foreground" role="alert">
              Your Google sign-in attempt expired. Please try again.
            </p>
          ) : null}
          {params.error === "google_start" ? (
            <p className="mb-5 rounded-md bg-error-container p-3 text-sm text-error-container-foreground" role="alert">
              Google sign-in could not start. Try again shortly or use email.
            </p>
          ) : null}
          {params.error === "oauth_cancelled" ? (
            <p className="mb-5 rounded-md bg-surface-low p-3 text-sm text-on-surface-variant" role="status">
              Google sign-in was cancelled. You can try again or use another method.
            </p>
          ) : null}
          {params.error === "oauth_failed" ? (
            <p className="mb-5 rounded-md bg-error-container p-3 text-sm text-error-container-foreground" role="alert">
              Google sign-in could not be completed. Try again or use another method.
            </p>
          ) : null}
          {params.error === "rate_limited" ? (
            <p className="mb-5 rounded-md bg-error-container p-3 text-sm text-error-container-foreground" role="alert">
              Too many attempts. Wait a little before trying again.
            </p>
          ) : null}
          {params.verification === "session_required" ? (
            <div className="mb-5 rounded-md bg-success-container p-4 text-success-container-foreground" role="status">
              <p className="font-semibold">Email verified successfully</p>
              <p className="mt-1 text-sm">Sign in to continue.</p>
            </div>
          ) : null}
          {params.verification === "expired" ? <VerificationRecovery /> : null}
          <AuthProviderOptions availability={availability} emailForm={<AuthForm
            action={loginAction}
            fields={[
              { name: "email", label: "Email", type: "email", autoComplete: "email", placeholder: "you@example.com" },
              { name: "password", label: "Password", type: "password", autoComplete: "current-password" },
            ]}
            footer={{ text: "Don't have an account?", label: "Create account", href: "/register" }}
            forgotPassword
            pendingLabel="Signing in..."
            submitLabel="Sign in with email"
          />} />
        </CardContent>
      </Card>
    </div>
  );
}
