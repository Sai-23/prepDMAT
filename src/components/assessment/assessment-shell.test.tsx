import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AssessmentActionZone, AssessmentShell } from "./assessment-shell";

describe("assessment shell", () => {
  it("keeps one scroll region between a stable header and action zone", () => {
    const markup = renderToStaticMarkup(
      <AssessmentShell
        actions={<AssessmentActionZone primary={<button type="button">Continue</button>} />}
        header={<h1>Question 1</h1>}
      >
        <p>Question content</p>
      </AssessmentShell>,
    );

    expect(markup).toContain('data-focused-assessment="true"');
    expect(markup).toContain("data-assessment-scroll-region");
    expect(markup).toContain("data-assessment-action-zone");
    expect(markup).toContain("overflow-y-auto");
    expect(markup).toContain("safe-area-inset-bottom");
  });

  it("renders tertiary, status, secondary, and primary actions without overlap", () => {
    const markup = renderToStaticMarkup(
      <AssessmentActionZone
        primary={<button type="button">Next</button>}
        secondary={<button type="button">Previous</button>}
        status={<span>Saved</span>}
        tertiary={<button type="button">Review</button>}
      />,
    );

    for (const label of ["Review", "Saved", "Previous", "Next"]) {
      expect(markup).toContain(label);
    }
  });
});
