import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { FormulaCard, MathExpression } from "@/components/general-academic/math-expression";

import { deriveSimpleLatex, formatGeneralAcademicUnit, renderGeneralAcademicLatex } from "./math";
import { canonicalGeneralAcademicPackSchema } from "./schemas";

const formula = () => canonicalGeneralAcademicPackSchema.parse(JSON.parse(readFileSync(resolve(process.cwd(), "docs/general-academic/examples/general-academic-pack-v1.json"), "utf8"))).stimulus.formulas[0];

describe("General Academic mathematical presentation", () => {
  it.each(["\\alpha", "Q_{\\mathrm{rec}}", "x^2", "\\frac{a}{b}", "\\sqrt{x}", "\\dot{m}", "a \\cdot b"])("renders common notation %s", (latex) => {
    expect(renderGeneralAcademicLatex(latex).valid).toBe(true);
  });

  it("keeps KaTeX trust disabled and rejects unsafe commands", () => {
    expect(renderGeneralAcademicLatex("\\href{javascript:alert(1)}{x}")).toEqual({ valid: false, reason: "unsafe_command" });
  });

  it("falls back to an escaped raw expression when LaTeX is invalid", () => {
    const html = renderToStaticMarkup(createElement(MathExpression, { latex: "\\notARealCommand{", fallback: "x < y && <script>bad()</script>" }));
    expect(html).toContain("x &lt; y &amp;&amp; &lt;script&gt;bad()&lt;/script&gt;");
    expect(html).not.toContain("<script>");
  });

  it("FormulaCard prefers display math and retains accessible machine text", () => {
    const html = renderToStaticMarkup(createElement(FormulaCard, { formula: formula(), technical: true }));
    expect(html).toContain("katex");
    expect(html).toContain("eta = E_recovered / E_input");
    expect(html).toContain("Technical math view");
  });

  it("falls back from missing display metadata and formats units without mutating data", () => {
    expect(deriveSimpleLatex("Q_rec = epsilon * m_dot * c_p * DeltaT")).toContain("\\varepsilon");
    expect(formatGeneralAcademicUnit("kJ/(kg*K)")).toBe("kJ/(kg·K)");
  });
});
