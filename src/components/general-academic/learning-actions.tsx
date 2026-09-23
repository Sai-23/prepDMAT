"use client";

import { Bookmark, BookmarkCheck, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { retryGeneralAcademicPracticePackAction, toggleGeneralAcademicBookmarkAction } from "@/app/practice/general-academic/learning-actions";
import { Button } from "@/components/ui/button";

export function GeneralAcademicBookmarkButton({ attemptId, packId, questionId, initialBookmarked, source = "practice" }: { attemptId: string; packId?: string; questionId: string; initialBookmarked: boolean; source?: "practice" | "mock" }) {
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const toggle = () => {
    const next = !bookmarked;
    setBookmarked(next);
    setError(null);
    startTransition(async () => {
      try {
        const result = await toggleGeneralAcademicBookmarkAction({ source, attemptId, packId, questionId, bookmarked: next });
        if (!result.ok) { setBookmarked(!next); setError(result.message); return; }
        setBookmarked(result.bookmarked);
      } catch {
        setBookmarked(!next);
        setError("Unable to update this bookmark. Try again.");
      }
    });
  };
  return (
    <div className="space-y-1">
      <Button aria-label={bookmarked ? "Remove bookmark" : "Bookmark question"} aria-pressed={bookmarked} disabled={pending} onClick={toggle} size="sm" variant={bookmarked ? "secondary" : "outline"}>
        {bookmarked ? <BookmarkCheck className="size-4" /> : <Bookmark className="size-4" />}
        {pending ? "Saving…" : bookmarked ? "Bookmarked" : "Bookmark"}
      </Button>
      {error ? <p className="max-w-48 text-xs text-error" role="alert">{error}</p> : null}
    </div>
  );
}

export function GeneralAcademicRetryButton({ attemptId, packId, source = "practice" }: { attemptId: string; packId?: string; source?: "practice" | "mock" }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <div>
      <Button disabled={pending} onClick={() => startTransition(async () => {
        setError(null);
        const result = await retryGeneralAcademicPracticePackAction({ attemptId, packId, source });
        if (!result.ok) { setError(result.message); return; }
        router.push(`/practice/general-academic/${result.attemptId}`);
      })} variant="outline">
        <RotateCcw className="size-4" /> {pending ? "Starting…" : "Retry This Pack"}
      </Button>
      {error ? <p className="mt-2 max-w-sm text-xs text-error" role="alert">{error}</p> : null}
    </div>
  );
}
