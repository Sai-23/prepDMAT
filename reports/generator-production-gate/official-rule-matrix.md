# Official evidence and product-policy matrix

Evidence re-audited against the current official dMAT General Academic Module
preparatory material dated 7 July 2026 and published at:
<https://www.d-mat.de/wp-content/uploads/2026/07/260716_dMAT_General-Academic-Module_Preparatoy-Materials_EN.pdf>.

Classifications used here are `OFFICIAL`, `OFFICIAL_COMPOSITION`, `SUPPORTING`,
`PRODUCT_FIDELITY`, and `EXPERIMENTAL`. `SUPPORTING` mechanics may inform
diversity but are not represented as current official law. `EXPERIMENTAL`
mechanics are disabled in production.

| Module | Rule or mechanic | Classification | Production treatment |
|---|---|---|---|
| Equation | Several equations contain letters whose values must be found | OFFICIAL | Required format |
| Equation | Each letter has exactly one solution | OFFICIAL | Independent finite-domain uniqueness proof |
| Equation | Letter values are integers 1–20 | OFFICIAL | Hard hidden-value gate |
| Equation | Addition and subtraction | OFFICIAL | Enabled |
| Equation | Multiplication by an integer coefficient | OFFICIAL | Enabled within supported coefficient policy |
| Equation | Exact division by an integer constant | OFFICIAL | Enabled; zero, fractional, and reversed semantics rejected |
| Equation | Pairwise sums, differences, complements, and weighted linear relations | OFFICIAL | Enabled where present in current examples |
| Equation | New chains/branches made only from official arithmetic primitives | OFFICIAL_COMPOSITION | Enabled with independent solve and difficulty validation |
| Equation | Pairwise triangle graph arrangement | SUPPORTING | Enabled as a supported arrangement; not called official |
| Equation | Every visible standalone number is 1–20 | PRODUCT_FIDELITY | Production-hard strict dMATPrep policy |
| Equation | Preferred coefficients 2–5 and mental-arithmetic presentation scoring | PRODUCT_FIDELITY | Construction policy plus hard supported-mechanic checks |
| Equation | Variable multiplication/division, powers, roots, quadratics, logarithms, calculus | EXPERIMENTAL | Disabled; unknown mechanics fail closed |
| Figure | A series of matrices asks for the next two matrices | OFFICIAL | Four visible and two missing matrices in product format |
| Figure | Figures may change position, colour, and orientation | OFFICIAL | Enabled and replayed |
| Figure | Horizontal, vertical, and diagonal movement | OFFICIAL | Enabled |
| Figure | A diagonal movement cannot change to another movement type | OFFICIAL | Hard diagonal lock |
| Figure | Constant movement and x+1 movement progression | OFFICIAL | Enabled |
| Figure | Constant/progressive colour and orientation changes | OFFICIAL | Enabled |
| Figure | Figures cannot disappear | OFFICIAL | Hard identity-preservation gate |
| Figure | Figures cannot overlap | OFFICIAL | Hard structural gate |
| Figure | Figures cannot leave the matrix | OFFICIAL | Hard structural gate |
| Figure | At an outer boundary, bounce or move along the boundary | OFFICIAL | Only validated bounce/follow behavior enabled |
| Figure | Clockwise/counter-clockwise border movement and quarter-turn rotation | OFFICIAL | Enabled where compatible |
| Figure | Multiple independent object streams composed in one sequence | OFFICIAL_COMPOSITION | Enabled with collision and inferability validation |
| Figure | Exactly three candidates for each of two missing matrices | PRODUCT_FIDELITY | Product response contract |
| Figure | Candidates must be renderer-distinct with exactly one rendered correct answer | PRODUCT_FIDELITY | Production-hard student-visible gate |
| Figure | Distractors are one-object near-neighbour reasoning errors | PRODUCT_FIDELITY | Hard accepted-candidate quality contract |
| Figure | Direction-cycle compositions beyond directly shown examples | SUPPORTING | Enabled only where evidence compatibility and all official hard rules pass |
| Figure | Disappearance, overlap, leaving the grid, unsupported boundary action | EXPERIMENTAL | Disabled/rejected rather than treated as diversity |

The official source establishes task mechanics and hard rules; it is not a
template catalog. Generated values, placements, graphs, sequences, and
distractors must remain diverse and must not reproduce official questions.
