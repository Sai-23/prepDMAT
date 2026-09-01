import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { MOCK_LIBRARY_CATEGORIES } from "@/lib/tests/catalog";
import type { TestCatalogItem } from "@/lib/tests/schemas";

import {
  FocusedMockCard,
  MockCategoryGrid,
  ModuleMockList,
} from "./mock-library";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

function testItem(
  id: string,
  moduleType: TestCatalogItem["moduleType"],
  completed = false,
  overrides: Partial<Omit<TestCatalogItem, "attemptSummary">> & {
    attemptSummary?: Partial<TestCatalogItem["attemptSummary"]>;
  } = {},
): TestCatalogItem {
  const item: TestCatalogItem = {
    id,
    title: id,
    description: null,
    testType: moduleType ? "sectional" : "full_mock",
    module: "core",
    moduleType,
    focusDifficulty: moduleType ? "easy" : null,
    durationSeconds: 900,
    isPremium: false,
    sectionCount: 1,
    questionCount: 10,
    hasAccess: true,
    attemptSummary: {
      completed,
      attemptCount: completed ? 2 : 0,
      bestScore: completed ? 8 : null,
      latestScore: completed ? 7 : null,
      latestCompletedAt: completed ? "2026-09-01T00:00:00.000Z" : null,
      hasInProgress: false,
    },
  };
  return {
    ...item,
    ...overrides,
    attemptSummary: {
      ...item.attemptSummary,
      ...overrides.attemptSummary,
    },
  };
}

describe("MockCategoryGrid", () => {
  it("renders three focused keyboard-navigable cards with dynamic counts", () => {
    const html = renderToStaticMarkup(
      <MockCategoryGrid tests={[
        testItem("figure-one", "figure_sequence", true),
        testItem("figure-two", "figure_sequence"),
        testItem("equation-one", "mathematical_equation"),
        testItem("latin-one", "latin_square"),
        testItem("mixed-one", null),
      ]} />,
    );
    expect(html).toContain("Figure Sequences");
    expect(html).toContain("Mathematical Equations");
    expect(html).toContain("Latin Squares");
    expect(html).not.toContain("Mixed Core");
    expect(html).toContain("2 mocks");
    expect(html).toContain("1 of 2 completed");
    expect(html).toContain("50%");
    expect(html).toContain("category=figure-sequences");
    expect(html.match(/role="progressbar"/g)).toHaveLength(3);
  });

  it("renders safe non-clickable zero-mock states without fake progress", () => {
    const html = renderToStaticMarkup(<MockCategoryGrid tests={[]} />);
    expect(html.match(/No mocks available yet/g)).toHaveLength(3);
    expect(html).not.toContain("role=\"progressbar\"");
    expect(html).not.toContain("NaN");
    expect(html).not.toContain("Infinity");
    expect(html).not.toContain("0 of 0");
    expect(html).not.toContain("href=");
  });

  it("uses a responsive one, two, and three-column grid with semantic theme tokens", () => {
    const html = renderToStaticMarkup(
      <MockCategoryGrid tests={[testItem("figure", "figure_sequence")]} />,
    );
    expect(html).toContain("md:grid-cols-2");
    expect(html).toContain("lg:grid-cols-3");
    expect(html).toContain("min-h-52");
    expect(html).toContain("bg-surface-lowest");
    expect(html).toContain("text-on-surface");
    expect(html).toContain("focus-visible:ring-primary");
    expect(html).toContain("motion-reduce:transition-none");
  });
});

describe("focused mock detail cards", () => {
  it("sorts Easy, Medium, and Hard before a future variant and uses difficulty guidance", () => {
    const html = renderToStaticMarkup(
      <ModuleMockList
        category={MOCK_LIBRARY_CATEGORIES[0]}
        tests={[
          testItem("hard", "figure_sequence", false, { title: "Hard Mock", focusDifficulty: "hard" }),
          testItem("future", "figure_sequence", false, { title: "Speed Practice", description: "A shorter custom sprint.", focusDifficulty: null }),
          testItem("easy", "figure_sequence", false, { title: "Easy Mock", focusDifficulty: "easy" }),
          testItem("medium", "figure_sequence", false, { title: "Medium Mock", focusDifficulty: "medium" }),
        ]}
      />,
    );

    expect(html.indexOf("Easy Mock")).toBeLessThan(html.indexOf("Medium Mock"));
    expect(html.indexOf("Medium Mock")).toBeLessThan(html.indexOf("Hard Mock"));
    expect(html.indexOf("Hard Mock")).toBeLessThan(html.indexOf("Speed Practice"));
    expect(html).toContain("Best for building confidence");
    expect(html).toContain("Build speed and consistency");
    expect(html).toContain("Challenge yourself under exam pressure");
    expect(html).toContain("A shorter custom sprint.");
  });

  it("renders dynamic question count, duration, and the authoritative best score as a percentage", () => {
    const html = renderToStaticMarkup(
      <FocusedMockCard
        test={testItem("completed", "figure_sequence", true, {
          title: "Compact Mock",
          questionCount: 20,
          durationSeconds: 15 * 60,
          attemptSummary: {
            attemptCount: 3,
            bestScore: 15,
            latestScore: 14,
          },
        })}
      />,
    );

    expect(html).toContain("20 Questions");
    expect(html).toContain("15 min");
    expect(html).toContain("Your best score:");
    expect(html).toContain("75%");
    expect(html).toContain("Try again");
    expect(html).not.toContain("Latest");
  });

  it("shows a neutral fresh state and prioritizes Resume for an active attempt", () => {
    const fresh = renderToStaticMarkup(
      <FocusedMockCard test={testItem("fresh", "latin_square")} />,
    );
    const active = renderToStaticMarkup(
      <FocusedMockCard
        test={testItem("active", "latin_square", true, {
          questionCount: 20,
          attemptSummary: {
            bestScore: 16,
            hasInProgress: true,
          },
        })}
      />,
    );

    expect(fresh).toContain("Not attempted yet");
    expect(fresh).toContain("Start mock");
    expect(fresh).not.toContain("0%");
    expect(active).toContain("Your best score:");
    expect(active).toContain("80%");
    expect(active).toContain("In progress");
    expect(active).toContain("Resume mock");
    expect(active).not.toContain("Try again");
  });
});
