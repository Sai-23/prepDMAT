# Core generator production invariants

Status: `RELEASE-FROZEN` as of 2026-08-25. The Equation and Figure generators
completed their required production audits with no automatic blocker. This
status applies only to generator readiness for student-facing staging.

This document governs student-facing Mathematical Equation and Figure Sequence
generation. It does not make the whole dMATPrep application production-ready,
and it does not change Latin Square algorithms.

## Mathematical Equations

- Every hidden letter value is a safe integer from 1 through 20.
- Strict dMATPrep fidelity is production-hard: every standalone numeric
  constant in the structured equations and final public formulae is a safe
  integer from 1 through 20. This is a `PRODUCT_FIDELITY` constraint, not a
  claim that current official material explicitly limits every visible number.
- The final formula blocks exactly match the validated AST and the notation
  rendered to students. Presentation metadata cannot override or diverge from
  the validated system.
- An independent finite-domain solver proves exactly one solution over 1–20.
- The independently solved assignment satisfies every equation exactly; integer
  division must have no remainder.
- Stored answers contain every requested variable, contain no other variable,
  and exactly match the independent solution.
- Every graph and relationship primitive has valid, enabled production
  evidence. Unknown, disabled, missing-evidence, nonlinear, and variable-divisor
  mechanics fail closed.
- Difficulty is based on reasoning structure—not large arithmetic—and must
  match the requested tier after strict validation.

## Figure Sequences

- Every visible, continuation, and candidate matrix preserves the initial
  object identities; objects neither disappear nor appear.
- No object overlaps another or leaves the grid.
- Diagonal movement remains diagonal. Boundary interactions use only validated
  bounce or outer-boundary-follow behavior.
- Movement, rotation, colour, and progression rules replay deterministically
  through both missing matrices.
- Each missing matrix has exactly three student-visible, renderer-distinct
  candidates and exactly one candidate equal to the simulated continuation.
- The stored answer identifies that unique rendered candidate in both stages.
- Distractors are valid grid states and one-object near-neighbour reasoning
  errors; they cannot become correct or duplicate after rendering.
- `canonicalRenderedMatrix` and `FigureMatrixSvg` share the same render model.
  Invisible IDs and simulation-only motion state never establish uniqueness;
  renderer symmetries and equivalent white paint states are normalized.
- The public grid, visible sequence, candidate frames, and response contract
  agree with the independently validated structured sequence.

## Shared acceptance and persistence

- Production generation is sequential and deterministic for the same seed,
  difficulty, configuration, and accepted attempt.
- Acceptance is fail closed. Construction, independent solve/simulation,
  evidence rules, product fidelity, answer uniqueness, distractors, difficulty,
  novelty, and the final student-visible contract must all pass.
- Practice, Targeted Practice, Diagnostic, Generated Mock, and Admin generation
  use validated generation pipelines. Direct generator calls are development
  and test-only and cannot be persisted as accepted content.
- Generated content is not persisted before successful validation. Persistence
  carries generator and validator provenance.
- Public snapshots exclude correct answers, solution paths, solution frames,
  dependency/solve metadata, and Figure rules. Private feedback snapshots stay
  separate.

## Future change gate

Any change to Figure or Equation generator, simulator, validator, canonicalizer,
renderer, or generation orchestration must rerun:

1. module regression and production-invariant tests;
2. Figure renderer-contract tests when Figure behavior or rendering changes;
3. a large accepted-population audit proportionate to the change;
4. Practice, Targeted Practice, Diagnostic, Generated Mock, persistence, and
   public-snapshot integration tests.

After release freeze, generator algorithms may change only for a reproducible
correctness defect, new current official evidence, or a formally reviewed
generator improvement. Any such change reopens the affected production audits.
