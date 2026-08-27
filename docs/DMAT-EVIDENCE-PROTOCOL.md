# dMAT evidence and protocol foundation

## Authority boundary

`DMAT_CURRENT_OFFICIAL` is the only source allowed to define current dMAT exam behavior.
`TESTAS_CURRENT_OFFICIAL` supports the shared digital Core format, while
`TESTAS_HISTORICAL_OFFICIAL` supports mechanics, difficulty, and reasoning only. Third-party
material can support generator rules but cannot define protocol.

The versioned current protocol is `DMAT_CURRENT_CORE_PROTOCOL`. Existing mock-test code keeps
the compatibility export `DMAT_EXAM_SPEC`, which references that protocol rather than repeating
counts or timing.

## Evidence dimensions

Evidence classification and source provenance are deliberately separate:

- classifications: `official`, `official_composition`, `third_party_supported`, `experimental`
- provenance: `DMAT_CURRENT_OFFICIAL`, `TESTAS_CURRENT_OFFICIAL`,
  `TESTAS_HISTORICAL_OFFICIAL`, `THIRD_PARTY`
- confidence: `very_high`, `high`, `medium`, `low`

Experimental entries are rejected if production-enabled. Unknown registry identifiers, source
values, or source/classification combinations are not accepted implicitly.

## Registries

Figure Sequence evidence contains abstract movement, step, boundary, rotation, and colour
primitives. Its hard-constraint registry points to existing validator/engine enforcement without
changing generation.

Latin Square evidence contains abstract deduction classifications. Its hard-constraint registry
points to the existing size, symbol, row/column, solver, and uniqueness enforcement.

Mathematical Equations retains its existing registries and serialized evidence strings. A
compatibility adapter adds shared provenance and confidence only when a shared evidence record is
requested; generation does not consume that adapter.

No registry stores official questions, screenshots, clue layouts, or figure sequences.

## Source catalog

- Current dMAT preparatory materials (July 2026):
  https://www.d-mat.de/wp-content/uploads/2026/07/260716_dMAT_General-Academic-Module_Preparatoy-Materials_EN.pdf
- Current digital TestAS structure:
  https://www.testas.de/en/teilnehmende/the-digital-testas/structure-of-the-digital-testas
- Historical official digital TestAS preparatory materials (April 2022):
  https://www.testas.de/fileadmin/bilder/4_pdf-video/1-teilnehmende/230531_digitalertestas_preparatory_materials.pdf

