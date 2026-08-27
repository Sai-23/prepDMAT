## 1. Executive summary

Mathematical Equations and Figure Sequences now fail closed against their final student-visible representations. Both 10,000-accepted-question audits, the 1,000-mock-equivalent audit, orchestration audits, manual 180-question visual review, full regression suite, TypeScript, lint, production build, and whitespace check completed without an automatic blocker. This verdict concerns only generator readiness for student-facing staging.

## 2. Official dMAT evidence re-audit

The evidence registry was rechecked against the current official dMAT preparatory PDF dated 7 July 2026 and the current official preparation pages. The material supports integer letter values 1–20; several equations with exactly one value per letter; addition, subtraction, multiplication, and exact division; and Figure changes in position, colour, and orientation with horizontal, vertical, diagonal, progressive, bounce, and boundary-follow behavior. The rule matrix is in `official-rule-matrix.md`.

## 3. Official vs product-fidelity constraints

Official rules, official compositions, supporting mechanics, product-fidelity rules, and disabled experimental mechanics are separated explicitly. The hidden letter domain is OFFICIAL. The rule that every visible standalone Equation constant must also be 1–20 is PRODUCT_FIDELITY. Three Figure options per missing matrix, renderer-distinct options, exactly one rendered correct option, and one-object near-neighbour distractors are also documented as product contracts rather than official claims.

## 4. Previous Equation root cause

The old presentation policy allowed visible constants through 40 and treated presentation quality separately from construction feasibility. A valid hidden assignment could therefore produce a visible total such as 31. The final public formula was not the single source of truth for the numeric-domain gate.

## 5. Equation architecture changes

The generator is now constraint-aware before construction. Graph intent, relationship intent, coefficients, feasible assignments, and public equations are planned so every required visible value can remain 1–20. Candidate validation remains mandatory after construction.

## 6. Equation strict-mode implementation

`strictDmatFidelity` is enabled in the production style policy. Hidden values and all standalone visible constants have hard minimum 1 and maximum 20. Out-of-range feasibility receives an infinite construction penalty and any surviving violation is rejected.

## 7. Equation validator changes

The validator independently enumerates the 1–20 domain, requires exactly one solution, substitutes the solved assignment into every equation, enforces exact integer division, checks stored targets and answers, verifies enabled evidence for every mechanic, rejects unknown/disabled mechanics, and compares every public formula block with the validated AST renderer.

## 8. Equation regression fixture

The observed failure class with a visible total of 31 is permanently rejected. Additional tests tamper with public formula text, check the general hidden/visible 1–20 invariant, exercise exact division, and verify malformed or unsupported relationships fail closed.

## 9. Equation 10,000-question audit

10,000/10,000 accepted: Easy 3,334, Medium 3,333, Hard 3,333. All zero: hidden-domain violations, visible-domain violations, non-integers, non-unique or zero solutions, unsatisfied equations, invalid division, unsupported mechanics, stored-answer mismatches, difficulty mismatches, public-presentation mismatches, and accepted-invalid questions.

## 10. Equation difficulty progression

The 200-per-tier audit passed. Average solve steps were 2.465 / 3.970 / 5.965; substitutions 1.000 / 2.210 / 3.420; complexity 2.670 / 10.305 / 17.300 for Easy / Medium / Hard. Hard recombination frequency is 0.625 after final graph calibration.

## 11. Equation diversity after <=20 enforcement

All ten graph families and all eleven enabled relationship families appeared. Coefficients 2–5 all appeared. Every hidden value 1–20 appeared. Global exact-fingerprint reuse was 2,534/10,000 and structural reuse 7,580/10,000; within assembled Practice and Mock sections the existing novelty gates prevented exact repeats.

## 12. Equation rejection distribution

The final 10,000 accepted questions required 10,078 attempts (1.008 per accepted). All 78 rejections were novelty rejections; strict-domain, solver, mechanic, answer, difficulty, and public-presentation accepted-failure counts were zero.

## 13. Previous Figure duplicate-candidate root cause

The former candidate identity included internal object IDs and normalized only a subset of renderer symmetries. The renderer does not display IDs or motion state, treats rotations of circles/squares/diamonds according to their visible symmetry, and can render solid white and outline white equivalently. Internally different candidates could therefore be visually identical.

## 14. Canonical rendered-matrix architecture

`canonicalRenderedMatrix` now records grid-visible object count, normalized shape, row, column, visible orientation, colour, fill, and stroke semantics in order-independent form. It deliberately excludes object ID and simulation-only state.

## 15. Renderer/canonicalizer agreement

`FigureMatrixSvg` and the canonicalizer consume the same `figureSymbolRenderModel`. Renderer symmetry and white-paint normalization therefore cannot diverge from uniqueness checks.

## 16. Figure candidate uniqueness changes

Distractors are de-duplicated during construction by canonical rendered identity. The validator independently requires three renderer-distinct candidates for each missing matrix and returns `DUPLICATE_RENDERED_CANDIDATE` on violation.

## 17. Figure correct-answer validation

Both continuation frames are replayed in temporal order. Each option set must contain exactly one canonical match; zero and multiple matches have separate hard failure codes, and the stored answer must identify that match in both stages.

## 18. Figure distractor changes

Distractors now replay plausible one-rule mutations such as a missed movement, wrong step/progression, missed boundary state, rotation, or colour transition. Malformed, out-of-grid, overlapping, correct-equivalent, renderer-duplicate, and invisible-metadata-only options are rejected at construction and validation.

## 19. Figure simulator/validator separation

Generation constructs an intended composition and uses the deterministic evolution engine. Validation separately checks hard frame constraints, evidence compatibility, inferability, public/structured agreement, temporal replay, rendered uniqueness, answer identity, and difficulty. The evolution kernel is shared; this residual common-mode risk is documented and offset by focused engine tests, contract tests, large audits, and manual review.

## 20. Figure renderer regression tests

Eight render-contract tests cover ignored IDs/motion state, object ordering, circle/square/diamond symmetry, arrow/triangle orientation, solid/outline white equivalence, and an actual SVG boundary check. Generator tests include a metadata-distinct but visually identical candidate regression.

## 21. Figure 10,000-question audit

10,000/10,000 accepted: Easy 3,334, Medium 3,333, Hard 3,333. All zero: duplicate rendered candidates, zero/multiple correct sets, wrong stored answers, disappearance, overlap, out-of-grid states, boundary violations, replay failures, render-contract failures, difficulty mismatches, and accepted-invalid questions.

## 22. Figure rejection distribution

The audit required 28,603 attempts (2.860 per accepted). All 18,603 rejected candidates were difficulty mismatches; no invalid candidate entered the accepted population. The focused 100-per-tier audit showed the retry concentration is Medium (771 attempts for 100 accepted).

## 23. Cross-seed adversarial results

Each generator accepted 2,000 questions from each of five groups: sequential, hashed/random-looking deterministic, edge-case, retry-heavy, and regression seeds. Every group completed and contributed to the same zero-invalid population.

## 24. Determinism/retry stability

Protocol regression fingerprints were intentionally updated for Equation generator v8.1/validator v7 and Figure generator v5/validator v4. Same seed, difficulty, configuration, and attempt reproduce the same candidate. Equation graph selection stays stable across retries; bounded orchestration advances deterministically after an exhausted inner seed.

## 25. 1,000 mock-equivalent audit

1,000/1,000 complete Core mocks produced 60,000 questions. Critical failures, answer-integrity failures, strict-validation failures, and missing explanations were all zero. The merged result is `READY WITH MINOR ISSUES`; those minor issues are cross-session similarity, not invalid questions.

## 26. Practice-set audit

Ten repeats of every 5/10/20-question size across Easy/Medium/Hard/Mixed for both modules completed. Including targeted cases, the audit covered 260 sets and 2,900 questions with zero strict-validation, uniqueness, completion, or snapshot failures.

## 27. Targeted-Practice verification

Twenty targeted five-question sets (10 Figure rotation and 10 Equation chain sets; 100 questions) used the normal validated pipeline and had zero failures. Target selection cannot bypass strict validation.

## 28. Diagnostic-path verification

One hundred deterministic 15-question diagnostics produced 1,500 questions with the fixed 5 Figure / 5 Equation / 5 Latin structure. All strict Figure and Equation checks and public-snapshot checks passed.

## 29. Generated-mock-path verification

The on-demand assembler uses validated manifests and private/public snapshot separation. The 1,000-mock audit verified 20 strict-valid Figure and 20 strict-valid Equation questions in every generated mock, with no incomplete assembly.

## 30. Persistence-gate verification

Generated mock persistence is called only after complete validated assembly. Transactional failure tests prove no partial attempt is returned, and persistence contract tests passed. No invalid generated question was observed reaching a persistence payload.

## 31. Public-snapshot/security verification

Equation public snapshots expose only variables, equations, domain, and the student response contract; dependency model and solve order were removed. Figure public snapshots exclude rules, solution frames, answers, and simulation state. Structural leak checks passed across Practice and Diagnostic audits.

## 32. 180-question manual visual audit

All 90 Equation and 90 Figure top-hash samples were rendered into 30 contact sheets and inspected at original resolution. Result: 180 PASS, 0 FAIL. No clipping, malformed Equation notation, illegible operators, missing candidates, visually duplicate Figure options, overlap, or unclear grids were observed. Per-sample records are in `manual-visual-review.md`.

## 33. Official-format comparison

ALIGNED: Equation integer-letter systems and arithmetic notation; Figure matrix sequences, position/colour/orientation changes, diagonal rules, progression, and boundary behavior. ACCEPTABLE PRODUCT VARIATION: generated graph compositions, placements, values, and three-option response layout. SUPPORTING: direction-cycle compositions that pass evidence compatibility. UNSUPPORTED: none in the accepted population.

## 34. Generation performance before/after

No normalized pre-hardening 10,000-question timing artifact exists, so no fabricated before/after delta is claimed. Final Equation latency: P50 4.022 ms, P95 44.490 ms, P99 157.401 ms, max 2,401.730 ms, mean 14.707 ms. Final Figure: P50 5.735 ms, P95 56.515 ms, P99 151.476 ms, max 544.294 ms, mean 13.405 ms. Correctness gates remained hard.

## 35. Files modified

Core changes are grouped in `src/lib/generation/mathematical-equations/`, `src/lib/generation/figure-sequences/`, the two question renderers, `src/lib/practice/native.ts`, `src/lib/practice/generation.ts`, mock audit/merge code, production-gate audit code, `package.json`, generator documentation, and generated reports. Latin generator algorithms, General Academic, Dashboard, Progress, Onboarding UX, and Mock Analysis algorithms were not changed by this phase.

## 36. Tests added

Added final-public Equation presentation/domain regressions, the visible-31 fixture, Figure canonical-render tests, visually identical metadata candidate regression, protocol fingerprints, 10,000-per-module production audits, orchestration Practice/Targeted/Diagnostic audits, and strict checks inside the 1,000-mock audit. Difficulty audits were recalibrated to test monotonic reasoning complexity rather than unsupported exact composition recipes.

## 37. Full regression results

`npm run lint`: PASS. `npm run typecheck`: PASS. `npm test`: PASS, 90 files and 481 tests; 17 opt-in audit files skipped in the normal run and executed separately where required. `npm run build`: PASS under Next.js 16.3.0, including TypeScript and 32 static pages. `git diff --check`: PASS with only existing LF-to-CRLF notices.

## 38. Remaining weaknesses

Equation global structural reuse is 75.80% and exact-fingerprint reuse 25.34% across 10,000 independent generations; Figure equivalents are 39.83% and 12.70%. Session/mock novelty gates prevent local exact repeats, but future taxonomy growth would improve cross-session freshness. Figure Medium acceptance averages 7.71 attempts in the focused audit. The Figure evolution kernel remains shared between construction and replay validation.

## 39. BLOCKER/HIGH/MEDIUM/LOW findings

BLOCKER: none. HIGH: none. MEDIUM: finite Equation taxonomy causes substantial global reuse; Figure Medium difficulty filtering is retry-heavy. LOW: shared Figure evolution-kernel common-mode risk, near-clone similarity across very large mock populations, and Vite CJS deprecation warnings in audit tooling. None permits an invalid accepted question.

## 40. Production invariants created

`docs/CORE-GENERATOR-PRODUCTION-INVARIANTS.md` records Equation domain/solver/presentation/mechanic gates; Figure rendered uniqueness, temporal replay, grid, distractor, and renderer-contract gates; shared fail-closed orchestration, persistence, public-snapshot, determinism, and future-change requirements.

## 41. Generator freeze status

Mathematical Equations and Figure Sequences are marked `RELEASE-FROZEN` as of 2026-08-25. Any algorithm, validator, simulator, canonicalizer, renderer, or orchestration change must reopen the relevant module, large-sample, render-contract, and integration gates. This does not declare the full application production-ready.

## 42. FINAL GENERATOR VERDICT

GENERATOR READY FOR STAGING — RELEASE FREEZE APPROVED
