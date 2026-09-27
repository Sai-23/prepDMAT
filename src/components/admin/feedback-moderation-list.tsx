"use client";

import { useState, useTransition } from "react";

import { moderateFeedbackAction } from "@/app/admin/feedback/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AdminFeedbackItem } from "@/lib/feedback/data";
import { canFeatureFeedback } from "@/lib/feedback/model";
import type { FeedbackModerationInput } from "@/lib/feedback/schemas";

const textAreaClass = "min-h-20 w-full resize-none rounded-md border border-input-border bg-input-background px-3 py-2 text-sm focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-muted";

function FeedbackCard({ item }: { item: AdminFeedbackItem }) {
  const [current, setCurrent] = useState(item);
  const [testimonial, setTestimonial] = useState(item.testimonial_public ?? item.liked_most ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const eligible = canFeatureFeedback(current);

  function run(input: FeedbackModerationInput) {
    if (pending) return;
    setMessage(null);
    startTransition(async () => {
      const result = await moderateFeedbackAction(input);
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      const updated = { ...current, ...result.feedback };
      setCurrent(updated);
      setTestimonial(updated.testimonial_public ?? updated.liked_most ?? "");
      setMessage(input.action === "approve"
        ? "Approved. Review the public text, then select Feature to publish it."
        : input.action === "feature"
          ? "Featured. This testimonial is now eligible for the homepage."
          : input.action === "unfeature" || input.action === "reject"
            ? "Removed from the public testimonial feed."
            : "Public testimonial text saved.");
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>{current.studentName}</CardTitle>
            <p className="mt-1 font-mono text-xs text-muted-foreground">{current.user_id}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="subtle">{current.status}</Badge>
            {current.status === "approved"
              ? <Badge variant={current.is_featured ? "success" : "subtle"}>{current.is_featured ? "Featured" : "Not featured"}</Badge>
              : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2"><span aria-label={`${current.rating} out of 5 stars`} className="text-xl text-primary">{"★".repeat(current.rating)}{"☆".repeat(5 - current.rating)}</span><span className="text-sm text-muted-foreground">{new Date(current.created_at).toLocaleDateString("en")}</span></div>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div><dt className="font-semibold">Liked most</dt><dd className="mt-1 whitespace-pre-wrap text-on-surface-variant">{current.liked_most || "—"}</dd></div>
          <div><dt className="font-semibold">Improvements</dt><dd className="mt-1 whitespace-pre-wrap text-on-surface-variant">{current.improvements || "—"}</dd></div>
          <div><dt className="font-semibold">Public consent</dt><dd className="mt-1 text-on-surface-variant">{current.public_consent ? "Yes" : "No"}</dd></div>
          <div><dt className="font-semibold">Reviewed</dt><dd className="mt-1 text-on-surface-variant">{current.reviewed_at ? new Date(current.reviewed_at).toLocaleString("en") : "Not yet"}</dd></div>
        </dl>
        <label className="block space-y-2"><span className="text-sm font-semibold">Public testimonial</span><textarea className={textAreaClass} disabled={pending || !eligible} maxLength={200} onChange={(event) => setTestimonial(event.target.value)} value={testimonial} /></label>
        <p className="text-xs leading-5 text-muted-foreground">
          {current.status === "pending"
            ? "Approve first. Approval prepares the student's positive feedback as the default public text but does not publish it."
            : !current.public_consent
              ? "This review cannot be featured because the student did not provide public consent."
              : current.is_featured
                ? "Featured: this public text is eligible to appear on the homepage."
                : "Not featured: review the public text, then select Feature to publish it on the homepage."}
        </p>
        <div className="flex flex-wrap gap-2">
          {current.status === "pending" ? <><Button disabled={pending} onClick={() => run({ feedbackId: current.id, action: "approve" })} size="sm">Approve</Button><Button disabled={pending} onClick={() => run({ feedbackId: current.id, action: "reject" })} size="sm" variant="destructive">Reject</Button></> : null}
          {current.status === "approved" ? <Button disabled={pending} onClick={() => run({ feedbackId: current.id, action: "reject" })} size="sm" variant="destructive">Reject</Button> : null}
          {eligible ? <><Button disabled={pending} onClick={() => run({ feedbackId: current.id, action: "edit_testimonial", testimonialPublic: testimonial })} size="sm" variant="outline">Save public text</Button><Button disabled={pending} onClick={() => run({ feedbackId: current.id, action: current.is_featured ? "unfeature" : "feature" })} size="sm" variant="secondary">{current.is_featured ? "Unfeature" : "Feature"}</Button></> : null}
        </div>
        {message ? <p aria-live="polite" className="text-sm text-muted-foreground">{message}</p> : null}
      </CardContent>
    </Card>
  );
}

export function FeedbackModerationList({ items }: { items: AdminFeedbackItem[] }) {
  return <div className="space-y-4">{items.map((item) => <FeedbackCard item={item} key={item.id} />)}{!items.length ? <p className="rounded-lg border border-workspace-border bg-surface-container p-5 text-sm text-muted-foreground">No feedback in this queue.</p> : null}</div>;
}
