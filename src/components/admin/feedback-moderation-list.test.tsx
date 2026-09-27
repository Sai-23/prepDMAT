import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const source = readFileSync(
  resolve(process.cwd(), "src/components/admin/feedback-moderation-list.tsx"),
  "utf8",
);

describe("admin feedback moderation workflow", () => {
  it("exposes all three moderation queues", () => {
    const page = readFileSync(resolve(process.cwd(), "src/app/admin/feedback/page.tsx"), "utf8");
    expect(page).toContain('["pending", "approved", "rejected"]');
  });

  it("makes the separate approve and feature stages explicit", () => {
    expect(source).toContain("Approval prepares the student's positive feedback as the default public text but does not publish it.");
    expect(source).toContain("Not featured: review the public text, then select Feature to publish it on the homepage.");
    expect(source).toContain('current.is_featured ? "Featured" : "Not featured"');
  });

  it("uses the returned moderation row so actions do not leave stale controls", () => {
    expect(source).toContain("const updated = { ...current, ...result.feedback }");
    expect(source).toContain("setCurrent(updated)");
    expect(source).toContain("setTestimonial(updated.testimonial_public ?? updated.liked_most ?? \"\")");
  });

  it("reports action failures instead of presenting a false success state", () => {
    expect(source).toContain("if (!result.ok)");
    expect(source).toContain("setMessage(result.error)");
    expect(source.indexOf("setMessage(result.error)")).toBeLessThan(source.indexOf("setCurrent(updated)"));
  });
});
