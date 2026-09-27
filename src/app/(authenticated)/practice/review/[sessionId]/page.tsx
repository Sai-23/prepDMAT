import { PageShell } from "@/components/layout/page-shell";
import { PracticeReview } from "@/components/practice/practice-review";
import { requireUser } from "@/lib/auth/guards";
import { getPracticeReview } from "@/lib/practice/data";

export default async function PracticeReviewPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const user = await requireUser();
  const { sessionId } = await params;
  const review = await getPracticeReview(user.id, sessionId);
  return <PageShell eyebrow="Practice review" title="Review your session" description="Your submitted answers, outcomes, timings, and worked explanations are preserved exactly as completed."><PracticeReview review={review} /></PageShell>;
}
