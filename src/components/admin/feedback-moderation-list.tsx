"use client";

import { useState, useTransition } from "react";

import { moderateFeedbackAction } from "@/app/admin/feedback/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AdminFeedbackItem } from "@/lib/feedback/data";
import { canFeatureFeedback } from "@/lib/feedback/model";

const textAreaClass = "min-h-20 w-full resize-none rounded-md border border-input-border bg-input-background px-3 py-2 text-sm focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-muted";

function FeedbackCard({ item }: { item: AdminFeedbackItem }) {
  const [testimonial, setTestimonial] = useState(item.testimonial_public ?? item.liked_most ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const eligible = canFeatureFeedback(item);

  function run(input: Parameters<typeof moderateFeedbackAction>[0]) {
    if (pending) return;
    setMessage(null);
    startTransition(async () => {
      const result = await moderateFeedbackAction(input);
      setMessage(result.ok ? "Feedback updated." : result.error);
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>{item.studentName}</CardTitle>
            <p className="mt-1 font-mono text-xs text-muted-foreground">{item.user_id}</p>
          </div>
          <div className="flex flex-wrap gap-2"><Badge variant="subtle">{item.status}</Badge>{item.is_featured ? <Badge variant="success">Featured</Badge> : null}</div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2"><span aria-label={`${item.rating} out of 5 stars`} className="text-xl text-primary">{"★".repeat(item.rating)}{"☆".repeat(5 - item.rating)}</span><span className="text-sm text-muted-foreground">{new Date(item.created_at).toLocaleDateString("en")}</span></div>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div><dt className="font-semibold">Liked most</dt><dd className="mt-1 whitespace-pre-wrap text-on-surface-variant">{item.liked_most || "—"}</dd></div>
          <div><dt className="font-semibold">Improvements</dt><dd className="mt-1 whitespace-pre-wrap text-on-surface-variant">{item.improvements || "—"}</dd></div>
          <div><dt className="font-semibold">Public consent</dt><dd className="mt-1 text-on-surface-variant">{item.public_consent ? "Yes" : "No"}</dd></div>
          <div><dt className="font-semibold">Reviewed</dt><dd className="mt-1 text-on-surface-variant">{item.reviewed_at ? new Date(item.reviewed_at).toLocaleString("en") : "Not yet"}</dd></div>
        </dl>
        <label className="block space-y-2"><span className="text-sm font-semibold">Public testimonial</span><textarea className={textAreaClass} disabled={pending || !eligible} maxLength={200} onChange={(event) => setTestimonial(event.target.value)} value={testimonial} /></label>
        <div className="flex flex-wrap gap-2">
          {item.status === "pending" ? <><Button disabled={pending} onClick={() => run({ feedbackId: item.id, action: "approve" })} size="sm">Approve</Button><Button disabled={pending} onClick={() => run({ feedbackId: item.id, action: "reject" })} size="sm" variant="destructive">Reject</Button></> : null}
          {item.status === "approved" ? <Button disabled={pending} onClick={() => run({ feedbackId: item.id, action: "reject" })} size="sm" variant="destructive">Reject</Button> : null}
          {eligible ? <><Button disabled={pending} onClick={() => run({ feedbackId: item.id, action: "edit_testimonial", testimonialPublic: testimonial })} size="sm" variant="outline">Save public text</Button><Button disabled={pending} onClick={() => run({ feedbackId: item.id, action: item.is_featured ? "unfeature" : "feature" })} size="sm" variant="secondary">{item.is_featured ? "Unfeature" : "Feature"}</Button></> : null}
        </div>
        {message ? <p aria-live="polite" className="text-sm text-muted-foreground">{message}</p> : null}
      </CardContent>
    </Card>
  );
}

export function FeedbackModerationList({ items }: { items: AdminFeedbackItem[] }) {
  return <div className="space-y-4">{items.map((item) => <FeedbackCard item={item} key={item.id} />)}{!items.length ? <p className="rounded-lg border border-workspace-border bg-surface-container p-5 text-sm text-muted-foreground">No feedback in this queue.</p> : null}</div>;
}
