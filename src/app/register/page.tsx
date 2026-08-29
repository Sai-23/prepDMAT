import { redirect } from "next/navigation";
import Link from "next/link";

import { registerAction } from "@/app/auth/actions";
import { AuthProviderOptions } from "@/components/auth/auth-providers";
import { AuthForm } from "@/components/auth/auth-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAuthProviderAvailability } from "@/lib/auth/config";
import { getCurrentUser } from "@/lib/auth/guards";
import { getPostAuthRoute } from "@/lib/auth/post-auth";

export default async function RegisterPage() {
  const user = await getCurrentUser();
  if (user) redirect(await getPostAuthRoute(user.id));

  const availability = getAuthProviderAvailability();

  return (
    <div className="mx-auto flex w-full max-w-md px-4 py-3 sm:px-6 sm:py-4">
      <Card className="w-full">
        <CardHeader className="space-y-1 p-4 pb-2">
          <CardTitle>Create your account</CardTitle>
          <CardDescription>
            Start preparing for the dMAT Core Module.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <AuthProviderOptions compact availability={availability} emailForm={<AuthForm
            action={registerAction}
            compact
            fields={[
              { name: "email", label: "Email", type: "email", autoComplete: "email", placeholder: "you@example.com" },
              { name: "password", label: "Password", type: "password", autoComplete: "new-password" },
              { name: "confirmPassword", label: "Confirm password", type: "password", autoComplete: "new-password" },
            ]}
            marketingConsent
            pendingLabel="Creating account..."
            submitLabel="Create account"
          />} />
          <p className="mt-3 text-center text-sm text-muted-foreground">
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
