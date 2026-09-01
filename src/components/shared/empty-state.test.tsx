import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { EmptyState } from "./empty-state";

describe("EmptyState", () => {
  it("renders an optional recovery action", () => {
    const html = renderToStaticMarkup(
      <EmptyState
        action={<a href="/practice">Start practice</a>}
        description="There is nothing here yet."
        title="No activity"
      />,
    );

    expect(html).toContain("No activity");
    expect(html).toContain('href="/practice"');
    expect(html).toContain("Start practice");
  });
});
