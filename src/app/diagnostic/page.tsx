import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { PageShell } from "@/components/layout/page-shell";
import { SiteFooter } from "@/components/layout/site-footer";
import { PublicDiagnosticStart } from "@/components/onboarding/public-diagnostic-start";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/guards";
import { getOnboardingState } from "@/lib/onboarding/data";
import { getPublicDiagnosticStatus } from "@/lib/onboarding/public-diagnostic";
import { indexRobots, siteConfig, siteUrl } from "@/lib/site-config";

const description = "Take a free dMAT Core diagnostic covering Figure Sequences, Mathematical Equations and Latin Squares. No account required to start.";

export const metadata: Metadata = {
  title: "Free dMAT Diagnostic Test",
  description,
  alternates: { canonical: "/diagnostic" },
  robots: indexRobots,
  openGraph: {
    type: "website",
    url: siteUrl("/diagnostic"),
    siteName: siteConfig.name,
    title: "Free dMAT Diagnostic Test | PrepDMAT",
    description,
  },
  twitter: {
    card: "summary",
    title: "Free dMAT Diagnostic Test | PrepDMAT",
    description,
  },
};

export default async function PublicDiagnosticPage() {
  const user = await getCurrentUser();
  if (user) {
    const onboarding = await getOnboardingState(user.id);
    if (onboarding.diagnosticStatus === "in_progress") redirect("/onboarding/diagnostic");
    if (onboarding.diagnosticStatus === "completed") redirect("/onboarding/diagnostic/summary");
  }
  const status = await getPublicDiagnosticStatus();
  if (status === "in_progress") redirect("/diagnostic/take");
  if (status === "completed") redirect("/diagnostic/result");

  return (
    <>
      <PageShell
        eyebrow="Free diagnostic"
        title="Find your Core starting point"
        description="Answer 15 real Core-style questions across Figure Sequences, Mathematical Equations and Latin Squares. No account is required to see your result."
      >
        <Card className="mx-auto max-w-3xl">
          <CardHeader>
            <CardTitle>Three modules. Fifteen untimed questions.</CardTitle>
            <CardDescription>
              Your answers are graded securely after each save, while correctness and explanations stay hidden until the diagnostic is complete.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3 text-sm sm:grid-cols-3">
              <p className="rounded-lg bg-surface-low p-3"><span className="block font-semibold">Figure Sequences</span>5 questions</p>
              <p className="rounded-lg bg-surface-low p-3"><span className="block font-semibold">Mathematical Equations</span>5 questions</p>
              <p className="rounded-lg bg-surface-low p-3"><span className="block font-semibold">Latin Squares</span>5 questions</p>
            </div>
            <PublicDiagnosticStart />
            <p className="text-xs text-muted-foreground">Your temporary diagnostic expires after two hours. Create an account after completion to keep the result.</p>
          </CardContent>
        </Card>
      </PageShell>
      <SiteFooter />
    </>
  );
}
