import { redirect } from "next/navigation";

import { PageShell } from "@/components/layout/page-shell";
import { DiagnosticExperience } from "@/components/onboarding/diagnostic-experience";
import {
  getActivePublicDiagnostic,
  getPublicDiagnosticStatus,
} from "@/lib/onboarding/public-diagnostic";

export default async function TakePublicDiagnosticPage() {
  const status = await getPublicDiagnosticStatus();
  if (status === "completed") redirect("/diagnostic/result");
  if (status !== "in_progress") redirect("/diagnostic");
  const session = await getActivePublicDiagnostic();
  if (!session) redirect("/diagnostic");

  return (
    <PageShell
      eyebrow="Free diagnostic"
      title="Core diagnostic"
      description="Answer 15 untimed questions. Feedback stays hidden until completion so it cannot influence later responses."
    >
      <DiagnosticExperience initialSession={session} publicSession />
    </PageShell>
  );
}

