export type FeedbackDraftValidation = {
  rating: string | null;
  likedMost: string | null;
  improvements: string | null;
};

export type FeedbackField = keyof FeedbackDraftValidation;

export function firstInvalidFeedbackField(
  validation: FeedbackDraftValidation,
): FeedbackField | null {
  if (validation.rating) return "rating";
  if (validation.likedMost) return "likedMost";
  if (validation.improvements) return "improvements";
  return null;
}

export function validateFeedbackDraft(input: {
  rating: number;
  likedMost: string;
  improvements: string;
}): FeedbackDraftValidation {
  const likedMostLength = input.likedMost.trim().length;
  const improvementsLength = input.improvements.trim().length;
  return {
    rating: !Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5
      ? "Please select a rating."
      : null,
    likedMost: likedMostLength === 0
      ? "Please tell us what you liked most."
      : likedMostLength > 200
        ? "Please keep your response within 200 characters."
        : null,
    improvements: improvementsLength > 200
      ? "Please keep your response within 200 characters."
      : null,
  };
}
