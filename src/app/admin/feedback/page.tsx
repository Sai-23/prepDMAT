import type { Route } from "next";
import Link from "next/link";

import { FeedbackModerationList } from "@/components/admin/feedback-moderation-list";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth/guards";
import { getAdminFeedback } from "@/lib/feedback/data";
import { feedbackStatusSchema, type FeedbackStatus } from "@/lib/feedback/schemas";

export default async function AdminFeedbackPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { roles } = await requireRole(["admin"]);
  const requested = feedbackStatusSchema.safeParse((await searchParams).status);
  const status: FeedbackStatus = requested.success ? requested.data : "pending";
  const items = await getAdminFeedback(status);
  return (
    <PageShell admin roles={roles} eyebrow="Admin · Feedback" title="Student feedback" description="Review private product feedback and explicitly approve eligible public testimonials.">
      <nav aria-label="Feedback status" className="flex flex-wrap gap-2">
        {(["pending", "approved", "rejected"] as const).map((value) => <Button asChild key={value} size="sm" variant={status === value ? "default" : "outline"}><Link href={`/admin/feedback?status=${value}` as Route}>{value[0].toUpperCase() + value.slice(1)}</Link></Button>)}
      </nav>
      <FeedbackModerationList items={items} />
    </PageShell>
  );
}
