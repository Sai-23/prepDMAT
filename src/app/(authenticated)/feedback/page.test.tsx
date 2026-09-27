import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ requireUser: vi.fn(), getSubmission: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname: () => "/feedback" }));
vi.mock("@/lib/auth/guards", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/lib/feedback/data", () => ({ getStudentFeedbackSubmission: mocks.getSubmission }));

import FeedbackPage from "./page";

describe("student feedback page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireUser.mockResolvedValue({ id: "student-a" });
  });

  it("shows the create form when no feedback exists", async () => {
    mocks.getSubmission.mockResolvedValue(null);

    const html = renderToStaticMarkup(await FeedbackPage());
    expect(html).toContain("How would you rate PrepDMAT?");
    expect(html).toContain("Submit feedback");
    expect(html).not.toContain("Feedback submitted");
  });

  it.each(["pending", "approved", "rejected"])(
    "shows a read-only submitted state for an existing %s row",
    async (status) => {
      mocks.getSubmission.mockResolvedValue({ id: `feedback-${status}`, public_consent: status === "approved", status });

      const html = renderToStaticMarkup(await FeedbackPage());
      expect(html).toContain("Feedback submitted");
      expect(html).toContain("Back to Dashboard");
      expect(html).not.toContain("How would you rate PrepDMAT?");
      expect(html).not.toContain("Update feedback");
    },
  );
});
