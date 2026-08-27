# Mathematical Equations evidence taxonomy

Date: 2026-08-21

## Evidence boundary

The production vocabulary is derived from the official July 2026 dMAT preparatory material. The source demonstrates direct values, offsets, multiplication by a constant, exact division by a constant, complements, derived outputs, weighted sums, and multi-variable balances across low, medium, and high examples. The official questions themselves are not stored or used as generation templates.

Pairwise triangle topology is classified as `third_party_supported`. Its only external premise is the standard linear-system fact that three linear constraints can uniquely determine three variables and be solved by elimination/back-substitution. It does not introduce a new arithmetic operation.

Sources:

- Official dMAT preparatory material: `https://www.d-mat.de/wp-content/uploads/2026/07/260716_dMAT_General-Academic-Module_Preparatoy-Materials_EN.pdf`
- OpenStax, three-variable linear systems: `https://openstax.org/books/algebra-and-trigonometry-2e/pages/11-2-systems-of-linear-equations-three-variables`

## Production evidence levels

- `official`: directly demonstrated by official material.
- `official_composition`: a new graph arrangement composed only from demonstrated arithmetic primitives.
- `third_party_supported`: standard linear-system structure using only official arithmetic primitives.
- `experimental`: unsupported syllabus expansion; always disabled in production.

The runtime registry is descriptive constraint data. It does not contain complete equation layouts, constants, hidden assignments, or reference questions.

## Compositional dimensions

Graph selection is independent of relationship selection. Production graphs are direct, chain, reverse chain, star, triangle, branch, branch/recombine, merged, cascade, and mixed. Relationships are direct value, additive/subtractive offsets, scale, exact division, sum, difference, complement, weighted sum, multi-variable sum, and multi-variable balance.

For every candidate the generator:

1. Selects an evidence-enabled graph using a seed-stable selector that is independent of retry number.
2. Generates a hidden 1-20 integer assignment.
3. Selects compatible relationship kinds independently at each graph role.
4. Enforces the production-hard dMATPrep `PRODUCT_FIDELITY` rule that every
   displayed standalone constant is an integer from 1 through 20. The former
   hard allowance through 40 is retired; this is not represented as an
   explicit current-official visible-number rule.
5. Randomizes safe equation orientation and display order.
6. Sends the candidate to the independent solver and validator.
7. Applies exact, reference-structure, and recent-structure novelty checks.

Retries retain the selected graph family and never fall back to a fixed simple structure.

## Fingerprint V2

Fingerprint V2 converts each equation to a normalized linear form. It ignores variable names, equation order, side orientation, exact constants, and exact coefficient magnitudes. It preserves graph family, root strategy, signed unit/scaled coefficient classes, relationship roles, term counts, dependency depth, branch/recombination counts, constraint class, solve modes, and target depth.

Algebraically equivalent forms such as `Y = kX` and `kX = Y`, or `n - X = Y` and `X + Y = n`, remain structurally related.

## Final deterministic audit

The command is `npm run audit:equation-taxonomy`. It generated and independently validated 5,000 accepted questions, plus 30 hidden-solution development samples.

Like-for-like comparison against the previous 2,000-question run:

| Metric | Previous | New |
| --- | ---: | ---: |
| Unique normalized structures | 424 | 549 |
| Structural duplicate rate | 78.80% | 72.55% |
| Diversity score | 69.3869 | 70.5652 |

The full 5,000-question run produced 861 structures, a 82.78% structural duplicate rate, a 3.58% largest cluster, and a 66.9901 diversity score. Scores across different sample sizes are not directly comparable because the unique-structure ratio necessarily decreases as a finite structural vocabulary is sampled more deeply.

All 5,000 accepted systems had unique integer solutions in 1-20. There were zero negative displayed constants, zero exact duplicates, and no enabled experimental mechanics. Full distributions and samples are in `reports/mathematical-equations/taxonomy-audit.json` and `.md`.

## Remaining limitations

- Direct topology is exactly one-third of the balanced audit because every Easy question has two variables; splitting it into cosmetic two-node graph labels would game the metric.
- Scale and exact-division relationships are less frequent because solution-first compatibility requires clean integer ratios in 1-20.
- Constants above the preferred range still occur when the selected relationship kind has no equivalent clean <=20 realization. The maximum remains 40 and the overall average is 14.0336.
- `targetSymbol` is tracked for reasoning complexity and audit distribution. The existing official product response continues to request every letter value; changing that interaction would require a separately scoped UI/scoring change.
