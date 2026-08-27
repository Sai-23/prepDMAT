import { redirect } from "next/navigation";

import { loginAction } from "@/app/auth/actions";
import { AuthDivider, AuthProviderOptions } from "@/components/auth/auth-providers";
import { AuthForm } from "@/components/auth/auth-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAuthProviderAvailability } from "@/lib/auth/config";
import { getCurrentUser } from "@/lib/auth/guards";
import { getPostAuthRoute } from "@/lib/auth/post-auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const user = await getCurrentUser();
  if (user) redirect(await getPostAuthRoute(user.id));

  const availability = getAuthProviderAvailability();
  const hasAlternativeProvider = availability.google || availability.phone;

  return (
    <div className="mx-auto flex w-full max-w-md px-4 py-10 sm:px-6 sm:py-16">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Welcome back</CardTitle>
          <CardDescription>
            Sign in to continue your preparation and review your progress.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {params.error === "auth_callback" ? (
            <p className="mb-5 rounded-md bg-error-container p-3 text-sm text-error-container-foreground" role="alert">
              This sign-in link is invalid or expired. Request a new link and try again.
            </p>
          ) : null}
          {params.error === "google_start" ? (
            <p className="mb-5 rounded-md bg-error-container p-3 text-sm text-error-container-foreground" role="alert">
              Google sign-in could not start. Try again shortly or use email.
            </p>
          ) : null}
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
