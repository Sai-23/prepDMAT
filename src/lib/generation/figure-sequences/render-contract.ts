import type { FigureColor, FigureFrame, FigureSymbolState } from "./types";

export const FIGURE_RENDER_COLORS: Readonly<Record<FigureColor, string>> = {
  blue: "#2563eb",
  pink: "#ec4899",
  yellow: "#facc15",
  orange: "#f97316",
  green: "#16a34a",
  black: "#111827",
  white: "#ffffff",
};

export type FigureSymbolRenderModel = {
  shape: FigureSymbolState["shape"];
  row: number;
  column: number;
  orientation: FigureSymbolState["orientation"];
  fill: string;
  stroke: string;
  strokeWidth: 4;
};

/**
 * This is the shared authority for properties that affect student-visible SVG
 * output. Invisible IDs and simulation-only motion state are deliberately
 * excluded.
 */
export function figureSymbolRenderModel(
  symbol: FigureSymbolState,
): FigureSymbolRenderModel {
  const color = FIGURE_RENDER_COLORS[symbol.color];
  const rotationallySymmetric =
    symbol.shape === "circle" ||
    symbol.shape === "square" ||
    symbol.shape === "diamond";
  return {
    shape: symbol.shape,
    row: symbol.row,
    column: symbol.column,
    orientation: rotationallySymmetric ? 0 : symbol.orientation,
    fill: symbol.fill === "solid" ? color : "none",
    stroke: symbol.color === "white" ? "#334155" : color,
    strokeWidth: 4,
  };
}

function canonicalSymbol(model: FigureSymbolRenderModel): string {
  // White fill and transparent fill are pixel-equivalent on the renderer's
  // fixed white matrix background.
  const normalizedFill = model.fill === "#ffffff" ? "none" : model.fill;
  return JSON.stringify({ ...model, fill: normalizedFill });
}

export function canonicalRenderedSymbol(symbol: FigureSymbolState): string {
  return canonicalSymbol(figureSymbolRenderModel(symbol));
}

export function canonicalRenderedMatrix(frame: FigureFrame): string {
  return JSON.stringify(
    frame.symbols
      .map((symbol) => canonicalRenderedSymbol(symbol))
      .sort(),
  );
}
