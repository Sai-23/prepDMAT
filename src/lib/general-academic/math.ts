import katex from "katex";

const FORBIDDEN_LATEX_COMMAND = /\\(?:href|url|includegraphics|htmlClass|htmlId|htmlStyle|htmlData|class|id|style)\b/i;

export type GeneralAcademicMathAssessment =
  | { valid: true; html: string }
  | { valid: false; reason: "empty" | "unsafe_command" | "render_error" };

export function renderGeneralAcademicLatex(latex: string, displayMode = false): GeneralAcademicMathAssessment {
  const value = latex.trim();
  if (!value) return { valid: false, reason: "empty" };
  if (FORBIDDEN_LATEX_COMMAND.test(value)) return { valid: false, reason: "unsafe_command" };
  try {
    return {
      valid: true,
      html: katex.renderToString(value, {
        displayMode,
        output: "htmlAndMathml",
        throwOnError: true,
        strict: "error",
        trust: false,
        maxExpand: 500,
      }),
    };
  } catch {
    return { valid: false, reason: "render_error" };
  }
}

const SIMPLE_SYMBOLS: Record<string, string> = {
  alpha: "\\alpha",
  beta: "\\beta",
  gamma: "\\gamma",
  Delta: "\\Delta",
  DeltaT: "\\Delta T",
  theta: "\\theta",
  mu: "\\mu",
  sigma: "\\sigma",
  epsilon: "\\varepsilon",
  m_dot: "\\dot{m}",
};

export function deriveSimpleLatex(expression: string) {
  if (!/^[A-Za-z0-9_+*/().=<>\-\s]+$/.test(expression)) return null;
  return expression
    .replace(/\b[A-Za-z][A-Za-z0-9_]*\b/g, (symbol) => SIMPLE_SYMBOLS[symbol]
      ?? (symbol.includes("_") ? `${symbol.slice(0, symbol.indexOf("_"))}_{\\mathrm{${symbol.slice(symbol.indexOf("_") + 1)}}}` : symbol))
    .replace(/\s*\*\s*/g, " \\cdot ")
    .replace(/<=/g, "\\le ")
    .replace(/>=/g, "\\ge ");
}

export function formatGeneralAcademicUnit(unit: string) {
  return unit.replace(/\*/g, "·");
}
