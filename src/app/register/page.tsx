import { redirect } from "next/navigation";
import Link from "next/link";

import { registerAction } from "@/app/auth/actions";
import { AuthDivider, AuthProviderOptions } from "@/components/auth/auth-providers";
import { AuthForm } from "@/components/auth/auth-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAuthProviderAvailability } from "@/lib/auth/config";
import { getCurrentUser } from "@/lib/auth/guards";
import { getPostAuthRoute } from "@/lib/auth/post-auth";

export default async function RegisterPage() {
  const user = await getCurrentUser();
  if (user) redirect(await getPostAuthRoute(user.id));

  const availability = getAuthProviderAvailability();
  const hasAlternativeProvider = availability.google || availability.phone;

  return (
    <div className="mx-auto flex w-full max-w-md px-4 py-10 sm:px-6 sm:py-16">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Create your account</CardTitle>
          <CardDescription>
            Save practice history, review mistakes, and build a focused study plan.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AuthForm
            action={registerAction}
            fields={[
              { name: "fullName", label: "Full name", type: "text", autoComplete: "name", placeholder: "Your name" },
              { name: "email", label: "Email", type: "email", autoComplete: "email", placeholder: "you@example.com" },
              { name: "password", label: "Password", type: "password", autoComplete: "new-password" },
              { name: "confirmPassword", label: "Confirm password", type: "password", autoComplete: "new-password" },
            ]}
            marketingConsent
            pendingLabel="Creating account..."
            submitLabel="Create account"
          />
          {hasAlternativeProvider ? (
            <div className="mt-5 space-y-5">
              <AuthDivider />
              <AuthProviderOptions availability={availability} />
            </div>
          ) : null}
          <p className="mt-5 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link className="font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" href="/login">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
