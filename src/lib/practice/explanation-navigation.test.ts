import { describe, expect, it } from "vitest";

import { explanationNavigationReducer } from "./explanation-navigation";

describe("walkthrough disclosure state", () => {
  it("opens from the collapsed historical-review state and closes again", () => {
    const collapsed = { open: false, view: "all" as const, stepIndex: 0 };
    const expanded = explanationNavigationReducer(collapsed, { type: "open" });

    expect(expanded).toEqual({ open: true, view: "all", stepIndex: 0 });
    expect(explanationNavigationReducer(expanded, { type: "close" })).toEqual(collapsed);
  });
});
