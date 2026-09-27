import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { StudentFeedbackForm } from "@/components/feedback/student-feedback-form";
import { StudentTestimonials } from "@/components/marketing/student-testimonials";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("student feedback UI", () => {
  it("server-renders an enabled, touch-sized submit button before rating selection", () => {
    const html = renderToStaticMarkup(<StudentFeedbackForm />);
    const submit = html.match(/<button[^>]*type="submit"[^>]*>/)?.[0] ?? "";

    expect(submit).not.toMatch(/\sdisabled(?:=|\s|>)/);
    expect(submit).toContain("min-h-11");
    expect(submit).toContain("w-full");
    expect(html).toContain("Submit feedback");
  });

  it("keeps the form limited to the approved under-30-second fields", () => {
    const form = source("src/components/feedback/student-feedback-form.tsx");
    for (const copy of [
      "How would you rate PrepDMAT?",
      "What did you like most?",
      "What should we improve?",
      "You may show my review on the PrepDMAT homepage.",
      "Submit feedback",
    ]) expect(form).toContain(copy);
    expect(form).toContain('type="radio"');
    expect(form).toContain("noValidate");
    expect(form).not.toMatch(/<input[\s\S]*?name="rating"[\s\S]*?\brequired\b[\s\S]*?type="radio"/);
    expect(form.match(/maxLength=\{200\}/g)).toHaveLength(2);
    expect(form).not.toMatch(/email|testimonial field|name preference|usefulness scale/i);
    expect(form).not.toMatch(/Update feedback|existing\?\.|existing\.status/);
    expect(form).toContain('How would you rate PrepDMAT? <span className="font-normal text-muted-foreground">Required</span>');
    expect(form).toContain('What did you like most? <span className="font-normal text-muted-foreground">Required</span>');
    expect(form).toContain('What should we improve? <span className="font-normal text-muted-foreground">Optional</span>');
    expect(form.match(/>Optional<\/span>/g)).toHaveLength(1);
  });

  it("keeps submit clickable for validation and disables it only while pending", () => {
    const form = source("src/components/feedback/student-feedback-form.tsx");
    expect(form).toContain('disabled={pending} type="submit"');
    expect(form).not.toContain("disabled={!rating || pending}");
    expect(form).not.toContain("if (!rating || pending) return");
    expect(form).toContain("validateFeedbackDraft({ rating, likedMost, improvements })");
    expect(form).toContain('firstInvalidField === "rating"');
    expect(form).toContain('firstInvalidField === "likedMost"');
    expect(form).toContain("firstRatingRef.current?.focus()");
    expect(form).toContain("likedMostRef.current?.focus()");
    expect(form).toContain("else improvementsRef.current?.focus()");
    expect(form).toContain("submissionInFlight.current");
    expect(form).toContain('pending ? "Submitting..." : "Submit feedback"');
    const validationIndex = form.indexOf("const validation = validateFeedbackDraft");
    const invalidReturnIndex = form.indexOf("return;", validationIndex);
    const serverActionIndex = form.indexOf("submitStudentFeedbackAction", validationIndex);
    expect(validationIndex).toBeGreaterThan(-1);
    expect(invalidReturnIndex).toBeGreaterThan(validationIndex);
    expect(serverActionIndex).toBeGreaterThan(invalidReturnIndex);
    expect(form.indexOf("submissionInFlight.current = true")).toBeLessThan(serverActionIndex);
  });

  it("uses accessible inline errors while keeping improvement text and consent optional", () => {
    const form = source("src/components/feedback/student-feedback-form.tsx");
    expect(form).toContain('id="feedback-rating-error"');
    expect(form).toContain("aria-invalid={Boolean(ratingError)}");
    expect(form).toContain('role="radiogroup"');
    expect(form.match(/aria-required="true"/g)).toHaveLength(2);
    expect(form).toContain("setLikedMostError(validation.likedMost)");
    expect(form).toContain("setImprovementsError(validation.improvements)");
    expect(form).not.toMatch(/!improvements|!publicConsent/);
    expect(form).toContain("value={likedMost}");
    expect(form).toContain("value={improvements}");
  });

  it("leaves the submit control in normal mobile flow without pointer interception", () => {
    const form = source("src/components/feedback/student-feedback-form.tsx");
    const submit = form.match(/<Button className="min-h-11 w-full sm:w-auto"[\s\S]*?<\/Button>/)?.[0] ?? "";
    expect(submit).toContain('disabled={pending}');
    expect(submit).not.toMatch(/pointer-events-none|absolute|fixed|inset-|z-/);
    expect(form).not.toContain("onTouchStart");
  });

  it("switches to the shared submitted state immediately after a successful create", () => {
    const form = source("src/components/feedback/student-feedback-form.tsx");
    const submitted = source("src/components/feedback/feedback-submitted-state.tsx");
    expect(form).toContain("setSubmitted(true)");
    expect(form).toContain("<FeedbackSubmittedState publicConsent={submittedConsent} />");
    expect(submitted).toContain("Feedback submitted");
    expect(submitted).toContain("Back to Dashboard");
    expect(submitted).toContain("Go to Practice");
  });

  it("hides an empty testimonial section and renders only safe DTO fields", () => {
    expect(renderToStaticMarkup(<StudentTestimonials testimonials={[]} />)).toBe("");
    const html = renderToStaticMarkup(<StudentTestimonials testimonials={[{
      id: "review-1", rating: 5, testimonial: "Focused and clear", displayName: "Mira", createdAt: "2026-09-27T00:00:00Z",
    }]} />);
    expect(html).toContain("What students say");
    expect(html).toContain("Focused and clear");
    expect(html).toContain("Mira");
    expect(html).not.toMatch(/user_id|improvements|reviewed_by|pending/);
  });

  it.each([1, 2])("renders %s eligible testimonial cards", (count) => {
    const testimonials = Array.from({ length: count }, (_, index) => ({
      id: `review-${index}`,
      rating: 5,
      testimonial: `Review ${index}`,
      displayName: `Student ${index}`,
      createdAt: "2026-09-27T00:00:00Z",
    }));
    const html = renderToStaticMarkup(<StudentTestimonials testimonials={testimonials} />);
    expect(html.match(/<figure/g)).toHaveLength(count);
  });

  it("renders at most three testimonial cards when passed five", () => {
    const testimonials = Array.from({ length: 5 }, (_, index) => ({
      id: `review-${index}`,
      rating: 5,
      testimonial: `Review ${index}`,
      displayName: `Student ${index}`,
      createdAt: "2026-09-27T00:00:00Z",
    }));
    const html = renderToStaticMarkup(<StudentTestimonials testimonials={testimonials} />);
    expect(html.match(/<figure/g)).toHaveLength(3);
    expect(html).not.toContain("Review 4");
  });

  it("awaits public testimonial data on the homepage and passes it to the renderer", () => {
    const homepage = source("src/app/(public)/page.tsx");
    expect(homepage).toContain("await getPublicTestimonials()");
    expect(homepage).toContain("<StudentTestimonials testimonials={testimonials} />");
  });

  it("keeps feedback secondary and disables its prefetch path", () => {
    const navigation = source("src/lib/constants/navigation.ts");
    const sidebar = source("src/components/layout/app-sidebar.tsx");
    expect(navigation.split("export const studentNavigation")[1]).toContain('href: "/feedback"');
    expect(navigation.split("export const primaryNavigation")[1].split("export const studentNavigation")[0]).not.toContain("Feedback");
    expect(sidebar).toContain("prefetch={false}");
  });
});
