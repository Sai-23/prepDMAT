import { CheckCircle2 } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export function FeedbackSubmittedState({ publicConsent }: { publicConsent: boolean }) {
  return (
    <div className="space-y-5 rounded-lg border border-success/30 bg-success-container p-5 sm:p-6" role="status">
      <div>
        <div className="flex items-center gap-2 text-success-container-foreground">
          <CheckCircle2 aria-hidden="true" className="size-5" />
          <h2 className="text-lg font-semibold">Feedback submitted</h2>
        </div>
        <p className="mt-3 text-sm font-medium text-on-surface">Thanks for sharing your feedback.</p>
        <p className="mt-1 text-sm leading-6 text-on-surface-variant">
          Your response will help us improve PrepDMAT for future dMAT students.
        </p>
        {publicConsent ? (
          <p className="mt-2 text-sm leading-6 text-on-surface-variant">
            If you allowed us to use your review publicly, it may appear on the homepage after review.
          </p>
        ) : null}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button asChild><Link href="/dashboard">Back to Dashboard</Link></Button>
        <Button asChild variant="secondary"><Link href="/practice">Go to Practice</Link></Button>
      </div>
    </div>
  );
}
