import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { StudentTestimonials } from "@/components/marketing/student-testimonials";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("student feedback UI", () => {
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
    expect(form).toContain("required");
    expect(form.match(/maxLength=\{200\}/g)).toHaveLength(2);
    expect(form).not.toMatch(/email|testimonial field|name preference|usefulness scale/i);
    expect(form).not.toMatch(/Update feedback|existing\?\.|existing\.status/);
    expect(form).toContain('How would you rate PrepDMAT? <span className="font-normal text-muted-foreground">Required</span>');
    expect(form).toContain('What did you like most? <span className="font-normal text-muted-foreground">Recommended</span>');
    expect(form).toContain('What should we improve? <span className="font-normal text-muted-foreground">Optional</span>');
    expect(form.match(/>Optional<\/span>/g)).toHaveLength(1);
  });

  it("disables submission while pending and preserves controlled text after errors", () => {
    const form = source("src/components/feedback/student-feedback-form.tsx");
    expect(form).toContain("disabled={!rating || pending}");
    expect(form).toContain("if (!rating || pending) return");
    expect(form).toContain("value={likedMost}");
    expect(form).toContain("value={improvements}");
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

  it("keeps feedback secondary and disables its prefetch path", () => {
    const navigation = source("src/lib/constants/navigation.ts");
    const sidebar = source("src/components/layout/app-sidebar.tsx");
    expect(navigation.split("export const studentNavigation")[1]).toContain('href: "/feedback"');
    expect(navigation.split("export const primaryNavigation")[1].split("export const studentNavigation")[0]).not.toContain("Feedback");
    expect(sidebar).toContain("prefetch={false}");
  });
});
