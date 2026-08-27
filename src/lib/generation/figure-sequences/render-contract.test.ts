import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { FigureMatrixSvg } from "../../../components/questions/figure-matrix-svg";
import {
  canonicalRenderedMatrix,
  figureSymbolRenderModel,
} from "./render-contract";
import type { FigureFrame, FigureSymbolState } from "./types";

function symbol(overrides: Partial<FigureSymbolState> = {}): FigureSymbolState {
  return {
    id: "object-a",
    shape: "triangle",
    color: "blue",
    fill: "solid",
    orientation: 0,
    row: 1,
    column: 1,
    ...overrides,
  };
}

function frame(item: FigureSymbolState): FigureFrame {
  return { index: 4, symbols: [item] };
}

describe("Figure renderer contract", () => {
  it("excludes invisible identity and simulation metadata", () => {
    const first = frame(symbol({ id: "first" }));
    const second = frame(symbol({
      id: "second",
      motionState: { rowDelta: 1, columnDelta: 0 },
    }));
    expect(canonicalRenderedMatrix(first)).toBe(canonicalRenderedMatrix(second));
  });

  it.each(["circle", "square", "diamond"] as const)(
    "normalizes renderer-equivalent %s rotations",
    (shape) => {
      expect(canonicalRenderedMatrix(frame(symbol({ shape, orientation: 0 })))).toBe(
        canonicalRenderedMatrix(frame(symbol({ shape, orientation: 90 }))),
      );
    },
  );

  it.each(["triangle", "arrow"] as const)(
    "preserves visible %s orientation",
    (shape) => {
      expect(canonicalRenderedMatrix(frame(symbol({ shape, orientation: 0 })))).not.toBe(
        canonicalRenderedMatrix(frame(symbol({ shape, orientation: 90 }))),
      );
    },
  );

  it("normalizes white solid and outline paint on the fixed white background", () => {
    expect(canonicalRenderedMatrix(frame(symbol({ color: "white", fill: "solid" })))).toBe(
      canonicalRenderedMatrix(frame(symbol({ color: "white", fill: "outline" }))),
    );
  });

  it("uses the shared render model at the production SVG boundary", () => {
    const item = symbol({ shape: "square", orientation: 90, color: "pink" });
    const model = figureSymbolRenderModel(item);
    const html = renderToStaticMarkup(
      createElement(FigureMatrixSvg, {
        frame: frame(item),
        grid: { rows: 4, columns: 4 },
      }),
    );
    expect(model.orientation).toBe(0);
    expect(html).toContain("rotate(0)");
    expect(html).toContain(model.fill);
    expect(html).toContain('viewBox="0 0 256 256"');
  });
});
