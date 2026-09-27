import { forgotPasswordAction } from "@/app/auth/actions";
import { AuthForm } from "@/components/auth/auth-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ForgotPasswordPage() {
  return (
    <div className="mx-auto flex w-full max-w-md px-6 py-16">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Forgot password</CardTitle>
          <CardDescription>
            Enter your account email and we will send you a secure reset link.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AuthForm
            action={forgotPasswordAction}
            fields={[
              { name: "email", label: "Email", type: "email", autoComplete: "email", placeholder: "you@example.com" },
            ]}
            submitLabel="Send reset link"
            pendingLabel="Sending..."
            footer={{ text: "Remembered your password?", label: "Back to sign in", href: "/login" }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
