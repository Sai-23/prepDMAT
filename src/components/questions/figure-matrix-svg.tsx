import type { FigureFrame, FigureGridDefinition } from "@/lib/generation";
import { validateFigureFrameStructure } from "@/lib/generation";
import { figureSymbolRenderModel } from "@/lib/generation/figure-sequences";

const CELL_SIZE = 64;

export function FigureMatrixSvg({
  grid,
  frame,
  label,
  highlightSymbolId,
}: {
  grid: FigureGridDefinition;
  frame: FigureFrame;
  label?: string;
  highlightSymbolId?: string | null;
}) {
  const validation = validateFigureFrameStructure(grid, frame);
  if (!validation.valid) {
    return (
      <div className="rounded-md border border-error bg-error-container p-3 text-sm text-error-container-foreground" role="alert">
        Invalid matrix: {validation.issues.join(" ")}
      </div>
    );
  }

  const width = grid.columns * CELL_SIZE;
  const height = grid.rows * CELL_SIZE;
  return (
    <svg
      aria-label={label ?? `Matrix ${frame.index + 1}`}
      className="block h-auto w-full bg-white"
      role="img"
      viewBox={`0 0 ${width} ${height}`}
    >
      <title>{label ?? `Matrix ${frame.index + 1}`}</title>
      <rect fill="#ffffff" height={height} width={width} x="0" y="0" />
      {Array.from({ length: grid.rows + 1 }, (_, row) => (
        <line
          key={`row-${row}`}
          stroke="#64748b"
          strokeWidth="1.5"
          x1="0"
          x2={width}
          y1={row * CELL_SIZE}
          y2={row * CELL_SIZE}
        />
      ))}
      {Array.from({ length: grid.columns + 1 }, (_, column) => (
        <line
          key={`column-${column}`}
          stroke="#64748b"
          strokeWidth="1.5"
          x1={column * CELL_SIZE}
          x2={column * CELL_SIZE}
          y1="0"
          y2={height}
        />
      ))}
      {frame.symbols.map((symbol) => {
        const centerX = symbol.column * CELL_SIZE + CELL_SIZE / 2;
        const centerY = symbol.row * CELL_SIZE + CELL_SIZE / 2;
        const renderModel = figureSymbolRenderModel(symbol);
        const common = {
          fill: renderModel.fill,
          stroke: renderModel.stroke,
          strokeWidth: renderModel.strokeWidth,
        };
        const highlighted = !highlightSymbolId || symbol.id === highlightSymbolId;
        return (
          <g
            key={symbol.id}
            opacity={highlighted ? 1 : 0.18}
            className="transition-opacity motion-reduce:transition-none"
            transform={`translate(${centerX} ${centerY}) rotate(${renderModel.orientation})`}
          >
            {highlightSymbolId === symbol.id ? (
              <circle
                className="text-primary"
                cx="0"
                cy="0"
                fill="none"
                r="27"
                stroke="currentColor"
                strokeDasharray="5 4"
                strokeWidth="3"
              />
            ) : null}
            {symbol.shape === "circle" ? (
              <circle {...common} r="18" />
            ) : symbol.shape === "square" ? (
              <rect {...common} height="34" rx="2" width="34" x="-17" y="-17" />
            ) : symbol.shape === "triangle" ? (
              <polygon {...common} points="0,-21 20,17 -20,17" strokeLinejoin="round" />
            ) : symbol.shape === "diamond" ? (
              <polygon {...common} points="0,-22 22,0 0,22 -22,0" strokeLinejoin="round" />
            ) : (
              <polygon
                {...common}
                points="0,-23 20,1 8,1 8,21 -8,21 -8,1 -20,1"
                strokeLinejoin="round"
              />
            )}
          </g>
        );
      })}
    </svg>
  );
}
