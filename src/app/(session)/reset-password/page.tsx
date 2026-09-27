import { resetPasswordAction } from "@/app/auth/actions";
import { AuthForm } from "@/components/auth/auth-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ResetPasswordPage() {
  return (
    <div className="mx-auto flex w-full max-w-md px-6 py-16">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Reset password</CardTitle>
          <CardDescription>
            Choose a new password with at least eight characters, a letter, and a number.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AuthForm
            action={resetPasswordAction}
            fields={[
              { name: "password", label: "New password", type: "password", autoComplete: "new-password" },
              { name: "confirmPassword", label: "Confirm new password", type: "password", autoComplete: "new-password" },
            ]}
            submitLabel="Update password"
            pendingLabel="Updating..."
          />
        </CardContent>
      </Card>
    </div>
  );
}
