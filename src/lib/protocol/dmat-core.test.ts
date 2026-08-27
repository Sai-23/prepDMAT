import { describe, expect, it } from "vitest";

import { PROTOCOL_SOURCE_ROLES, canDefineCurrentDmatProtocol } from "../evidence";
import {
  DMAT_CURRENT_CORE_PROTOCOL,
  resolveCurrentDmatCoreProtocol,
} from "./dmat-core";

describe("current dMAT Core protocol authority", () => {
  it("keeps the current dMAT specification authoritative", () => {
    expect(DMAT_CURRENT_CORE_PROTOCOL.authority).toBe("DMAT_CURRENT_OFFICIAL");
    expect(DMAT_CURRENT_CORE_PROTOCOL.core).toEqual([
      { sectionType: "figure_sequence", title: "Figure Sequences", questionCount: 20, durationSeconds: 25 * 60 },
      { sectionType: "mathematical_equation", title: "Mathematical Equations", questionCount: 20, durationSeconds: 25 * 60 },
      { sectionType: "latin_square", title: "Latin Squares", questionCount: 20, durationSeconds: 25 * 60 },
    ]);
    expect(canDefineCurrentDmatProtocol("DMAT_CURRENT_OFFICIAL")).toBe(true);
    expect(PROTOCOL_SOURCE_ROLES.TESTAS_CURRENT_OFFICIAL).toBe("supporting_core_format");
    expect(PROTOCOL_SOURCE_ROLES.TESTAS_HISTORICAL_OFFICIAL)
      .toBe("mechanics_difficulty_reasoning_only");
  });

  it("does not let historical TestAS counts or timing override current dMAT", () => {
    const result = resolveCurrentDmatCoreProtocol([{
      source: "TESTAS_HISTORICAL_OFFICIAL",
      sectionType: "latin_square",
      questionCount: 16,
      durationSeconds: 20 * 60,
    }]);
    const latin = result.protocol.core.find((section) => section.sectionType === "latin_square");
    expect(latin).toMatchObject({ questionCount: 20, durationSeconds: 25 * 60 });
    expect(result.ignoredClaims).toEqual([expect.objectContaining({
      source: "TESTAS_HISTORICAL_OFFICIAL",
      reason: "not_protocol_authority",
    })]);
  });

  it("retains exact equation and Latin domains from their implementation constants", () => {
    expect(DMAT_CURRENT_CORE_PROTOCOL.constraints.mathematicalEquation).toEqual({
      variableDomain: { minimum: 1, maximum: 20 },
      integersOnly: true,
    });
    expect(DMAT_CURRENT_CORE_PROTOCOL.constraints.latinSquare).toEqual({
      size: 5,
      symbols: ["A", "B", "C", "D", "E"],
      uniqueWithinRows: true,
      uniqueWithinColumns: true,
    });
  });
});
