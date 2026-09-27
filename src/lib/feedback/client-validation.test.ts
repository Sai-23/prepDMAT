import { describe, expect, it } from "vitest";

import { firstInvalidFeedbackField, validateFeedbackDraft } from "./client-validation";

describe("feedback client validation", () => {
  it("reports both required fields at once", () => {
    expect(validateFeedbackDraft({ rating: 0, likedMost: "", improvements: "" })).toEqual({
      rating: "Please select a rating.",
      likedMost: "Please tell us what you liked most.",
      improvements: null,
    });
  });

  it.each([-1, 1.5, 6])("rejects an out-of-contract rating of %s", (rating) => {
    expect(validateFeedbackDraft({ rating, likedMost: "Valid feedback", improvements: "" }).rating)
      .toBe("Please select a rating.");
  });

  it.each([
    { likedMost: "Focused practice", improvements: "" },
    { likedMost: "Focused practice", improvements: "More examples" },
    { likedMost: "Mock tests", improvements: "speed" },
  ])("accepts required positive feedback with optional improvement text %#", ({ likedMost, improvements }) => {
    expect(validateFeedbackDraft({ rating: 5, likedMost, improvements })).toEqual({
      rating: null,
      likedMost: null,
      improvements: null,
    });
  });

  it.each(["", " ", "     ", "\n", "\n\n", "\t"])(
    "rejects whitespace-only positive feedback %j",
    (likedMost) => {
      expect(validateFeedbackDraft({ rating: 5, likedMost, improvements: "" }).likedMost)
        .toBe("Please tell us what you liked most.");
    },
  );

  it("clears only the corrected required field", () => {
    const ratingCorrected = validateFeedbackDraft({ rating: 5, likedMost: "", improvements: "" });
    expect(ratingCorrected.rating).toBeNull();
    expect(ratingCorrected.likedMost).toBe("Please tell us what you liked most.");

    const positiveFeedbackCorrected = validateFeedbackDraft({
      rating: 0,
      likedMost: "Practice questions",
      improvements: "",
    });
    expect(positiveFeedbackCorrected.rating).toBe("Please select a rating.");
    expect(positiveFeedbackCorrected.likedMost).toBeNull();
  });

  it("selects the first invalid field in form order", () => {
    expect(firstInvalidFeedbackField(validateFeedbackDraft({
      rating: 0,
      likedMost: "",
      improvements: "",
    }))).toBe("rating");
    expect(firstInvalidFeedbackField(validateFeedbackDraft({
      rating: 5,
      likedMost: "",
      improvements: "",
    }))).toBe("likedMost");
    expect(firstInvalidFeedbackField(validateFeedbackDraft({
      rating: 5,
      likedMost: "Mock tests",
      improvements: "x".repeat(201),
    }))).toBe("improvements");
    expect(firstInvalidFeedbackField(validateFeedbackDraft({
      rating: 5,
      likedMost: "Mock tests",
      improvements: "",
    }))).toBeNull();
  });

  it("reports over-limit text inline instead of changing button availability", () => {
    expect(validateFeedbackDraft({
      rating: 5,
      likedMost: "x".repeat(201),
      improvements: "y".repeat(201),
    })).toEqual({
      rating: null,
      likedMost: "Please keep your response within 200 characters.",
      improvements: "Please keep your response within 200 characters.",
    });
  });
});
