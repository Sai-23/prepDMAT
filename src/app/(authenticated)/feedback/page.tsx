import { StudentFeedbackForm } from "@/components/feedback/student-feedback-form";
import { FeedbackSubmittedState } from "@/components/feedback/feedback-submitted-state";
import { PageShell } from "@/components/layout/page-shell";
import { Card, CardContent } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/guards";
import { getStudentFeedbackSubmission } from "@/lib/feedback/data";

export default async function FeedbackPage() {
  const user = await requireUser();
  const existing = await getStudentFeedbackSubmission(user.id);
  return (
    <PageShell eyebrow="Feedback" title="Share your feedback" description="Takes less than 30 seconds." compact>
      <Card className="mx-auto w-full max-w-2xl">
        <CardContent className="p-5 sm:p-6">
          {existing
            ? <FeedbackSubmittedState publicConsent={existing.public_consent} />
            : <StudentFeedbackForm />}
        </CardContent>
      </Card>
    </PageShell>
  );
}
