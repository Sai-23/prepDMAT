import { logoutAction } from "@/app/auth/actions";
import { MarketingPreferencesForm } from "@/components/auth/marketing-preferences-form";
import { PageShell } from "@/components/layout/page-shell";
import { ThemePreferenceForm } from "@/components/theme/theme-preference-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/guards";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type MarketingProfile = {
  marketing_email_opt_in: boolean;
};

export default async function ProfilePage() {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("marketing_email_opt_in")
    .eq("id", user.id)
    .single()
    .overrideTypes<MarketingProfile, { merge: false }>();

  return (
    <PageShell
      description="Review your account details and securely end your current session."
      eyebrow="Profile"
      title="Manage account and study preferences"
    >
      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>
              Contact details come from the authentication method you chose.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Email</p>
              <p className="mt-1 font-semibold text-on-surface">
                {user.email ?? "No email linked"}
              </p>
            </div>
            <form action={logoutAction}>
              <Button type="submit" variant="outline">Sign out</Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>Select a persistent Light, Dark, or System theme.</CardDescription>
          </CardHeader>
          <CardContent><ThemePreferenceForm /></CardContent>
        </Card>
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Marketing preferences</CardTitle>
            <CardDescription>
              Account verification and service messages do not depend on these optional choices.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MarketingPreferencesForm
              emailOptIn={profile?.marketing_email_opt_in ?? false}
              hasEmail={Boolean(user.email)}
            />
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
