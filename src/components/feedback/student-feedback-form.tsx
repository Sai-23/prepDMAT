"use client";

import { useRef, useState, useTransition } from "react";

import { submitStudentFeedbackAction } from "@/app/feedback/actions";
import { FeedbackSubmittedState } from "@/components/feedback/feedback-submitted-state";
import { Button } from "@/components/ui/button";
import {
  firstInvalidFeedbackField,
  validateFeedbackDraft,
} from "@/lib/feedback/client-validation";

const textAreaClass = "min-h-20 w-full resize-none rounded-md border border-input-border bg-input-background px-3 py-2 text-sm text-on-surface placeholder:text-input-placeholder focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-muted disabled:opacity-50";

export function StudentFeedbackForm() {
  const [rating, setRating] = useState(0);
  const [likedMost, setLikedMost] = useState("");
  const [improvements, setImprovements] = useState("");
  const [publicConsent, setPublicConsent] = useState(false);
  const [submittedConsent, setSubmittedConsent] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ratingError, setRatingError] = useState<string | null>(null);
  const [likedMostError, setLikedMostError] = useState<string | null>(null);
  const [improvementsError, setImprovementsError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const firstRatingRef = useRef<HTMLInputElement>(null);
  const likedMostRef = useRef<HTMLTextAreaElement>(null);
  const improvementsRef = useRef<HTMLTextAreaElement>(null);
  const submissionInFlight = useRef(false);

  if (submitted) {
    return <FeedbackSubmittedState publicConsent={submittedConsent} />;
  }

  function submit() {
    if (submissionInFlight.current) return;

    const validation = validateFeedbackDraft({ rating, likedMost, improvements });
    setRatingError(validation.rating);
    setLikedMostError(validation.likedMost);
    setImprovementsError(validation.improvements);
    const firstInvalidField = firstInvalidFeedbackField(validation);
    if (firstInvalidField) {
      if (firstInvalidField === "rating") firstRatingRef.current?.focus();
      else if (firstInvalidField === "likedMost") likedMostRef.current?.focus();
      else improvementsRef.current?.focus();
      return;
    }

    submissionInFlight.current = true;
    setError(null);
    startTransition(async () => {
      try {
        const result = await submitStudentFeedbackAction({ rating, likedMost, improvements, publicConsent });
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setSubmittedConsent(result.publicConsent === true);
        setSubmitted(true);
      } catch {
        setError("We couldn't save your feedback. Your answers are still here—please try again.");
      } finally {
        submissionInFlight.current = false;
      }
    });
  }

  return (
    <form action={submit} className="space-y-5" noValidate>
      <fieldset disabled={pending}>
        <legend className="text-sm font-semibold text-on-surface">
          How would you rate PrepDMAT? <span className="font-normal text-muted-foreground">Required</span>
        </legend>
        <div
          aria-describedby={ratingError ? "feedback-rating-error" : undefined}
          aria-invalid={Boolean(ratingError)}
          aria-label="Overall rating"
          aria-required="true"
          className="mt-2 flex w-fit gap-1"
          role="radiogroup"
        >
          {[1, 2, 3, 4, 5].map((value) => (
            <label className="cursor-pointer" key={value}>
              <input
                aria-describedby={ratingError ? "feedback-rating-error" : undefined}
                checked={rating === value}
                className="peer sr-only"
                name="rating"
                onChange={() => {
                  setRating(value);
                  setRatingError(validateFeedbackDraft({ rating: value, likedMost, improvements }).rating);
                }}
                ref={value === 1 ? firstRatingRef : undefined}
                type="radio"
                value={value}
              />
              <span className="flex size-11 items-center justify-center rounded-md text-3xl leading-none text-primary ring-1 ring-transparent peer-focus-visible:ring-2 peer-focus-visible:ring-primary" aria-hidden="true">
                {value <= rating ? "★" : "☆"}
              </span>
              <span className="sr-only">{value} star{value === 1 ? "" : "s"}</span>
            </label>
          ))}
        </div>
        {ratingError ? <p className="mt-2 text-sm text-error" id="feedback-rating-error" role="alert">{ratingError}</p> : null}
      </fieldset>

      <label className="block space-y-2">
        <span className="text-sm font-semibold text-on-surface">What did you like most? <span className="font-normal text-muted-foreground">Required</span></span>
        <textarea
          aria-describedby={likedMostError ? "feedback-liked-most-error" : undefined}
          aria-invalid={Boolean(likedMostError)}
          aria-required="true"
          className={textAreaClass}
          disabled={pending}
          maxLength={200}
          onChange={(event) => {
            const nextLikedMost = event.target.value;
            setLikedMost(nextLikedMost);
            if (likedMostError) {
              setLikedMostError(validateFeedbackDraft({
                rating,
                likedMost: nextLikedMost,
                improvements,
              }).likedMost);
            }
          }}
          ref={likedMostRef}
          value={likedMost}
        />
        {likedMostError ? <span className="block text-sm text-error" id="feedback-liked-most-error" role="alert">{likedMostError}</span> : null}
        <span className="block text-right text-xs text-muted-foreground">{likedMost.length}/200</span>
      </label>

      <label className="block space-y-2">
        <span className="text-sm font-semibold text-on-surface">What should we improve? <span className="font-normal text-muted-foreground">Optional</span></span>
        <textarea
          aria-describedby={improvementsError ? "feedback-improvements-error" : undefined}
          aria-invalid={Boolean(improvementsError)}
          className={textAreaClass}
          disabled={pending}
          maxLength={200}
          onChange={(event) => {
            const nextImprovements = event.target.value;
            setImprovements(nextImprovements);
            if (improvementsError) {
              setImprovementsError(validateFeedbackDraft({
                rating,
                likedMost,
                improvements: nextImprovements,
              }).improvements);
            }
          }}
          ref={improvementsRef}
          value={improvements}
        />
        {improvementsError ? <span className="block text-sm text-error" id="feedback-improvements-error" role="alert">{improvementsError}</span> : null}
        <span className="block text-right text-xs text-muted-foreground">{improvements.length}/200</span>
      </label>

      <label className="flex cursor-pointer items-start gap-3 text-sm text-on-surface-variant">
        <input className="mt-0.5 size-4 accent-primary" checked={publicConsent} disabled={pending} onChange={(event) => setPublicConsent(event.target.checked)} type="checkbox" />
        <span>You may show my review on the PrepDMAT homepage.</span>
      </label>

      {error ? <p className="rounded-md border border-error/30 bg-error-container p-3 text-sm text-error-container-foreground" role="alert">{error}</p> : null}
      <Button className="min-h-11 w-full sm:w-auto" disabled={pending} type="submit">
        {pending ? "Submitting..." : "Submit feedback"}
      </Button>
    </form>
  );
}
