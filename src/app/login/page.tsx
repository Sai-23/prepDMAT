import { redirect } from "next/navigation";

import { loginAction } from "@/app/auth/actions";
import { AuthDivider, AuthProviderOptions } from "@/components/auth/auth-providers";
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
  const hasAlternativeProvider = availability.google || availability.phone;

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
              Automatic sign-in is temporarily unavailable. Sign in to continue.
            </p>
          ) : null}
          {params.error === "google_start" ? (
            <p className="mb-5 rounded-md bg-error-container p-3 text-sm text-error-container-foreground" role="alert">
              Google sign-in could not start. Try again shortly or use email.
            </p>
          ) : null}
          {params.verification === "session_required" ? (
            <div className="mb-5 rounded-md bg-success-container p-4 text-success-container-foreground" role="status">
              <p className="font-semibold">Email verified successfully</p>
              <p className="mt-1 text-sm">Sign in to continue.</p>
            </div>
          ) : null}
          {params.verification === "expired" ? <VerificationRecovery /> : null}
          {hasAlternativeProvider ? (
            <div className="mb-5 space-y-5">
              <AuthProviderOptions availability={availability} />
              <AuthDivider />
            </div>
          ) : null}
          <AuthForm
            action={loginAction}
            fields={[
              { name: "email", label: "Email", type: "email", autoComplete: "email", placeholder: "you@example.com" },
              { name: "password", label: "Password", type: "password", autoComplete: "current-password" },
            ]}
            footer={{ text: "Don't have an account?", label: "Create account", href: "/register" }}
            forgotPassword
            pendingLabel="Signing in..."
            submitLabel="Sign in with email"
          />
        </CardContent>
      </Card>
    </div>
  );
}
