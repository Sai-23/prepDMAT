# Phase 7 — Explanations and learning feedback

## 1. Existing explanation weaknesses

The pre-implementation audit found strong module-specific replay foundations but no shared educational contract. Figure explanations sampled only the first observed transition, Equation explanations did not state a mental solve strategy, and Latin explanations exposed a fully completed grid instead of staying on the target dependency path. Practice reused all three renderers, while completed mock review reused only Equation and fell back to generic content for Figure and Latin. Stored snapshots contained the answer and raw reasoning trace but no versioned educational model.

## 2. Shared explanation architecture

Added `educational-explanation@1` with `summary`, `observation`, referenced `steps`, `answerConclusion`, `takeaway`, reasoning classification, and replay-validation source. The contract is serializable, deterministic, validated before use, and shared by Figure, Equation, and Latin. Learners see progressive disclosure: quick explanation, detailed walkthrough, then answer conclusion and takeaway.

## 3. Figure improvements

Figure explanations replay the stored rules through the existing simulator. Each object is named and tracked separately. Every object card now lists all five simulated transitions, including position, orientation, and colour changes. Linear and direction-cycle edge reversals are stated as learner-facing bounce behavior. Both missing matrices are matched against the replayed frames.

## 4. Figure diagnosis

Wrong choices are compared with the correct simulated frame by stable object ID. Feedback names only mechanically observed differences: position, orientation, and/or colour. It does not claim why the student made the mistake because distractors do not carry causal error labels.

## 5. Equation improvements

Equation explanations follow the validated solution path, not display order. They state the useful starting relationship, show the original relationship, rewrite it with known values, and conclude each short step with the solved variable. Equation references identify the exact relationships used.

## 6. Equation mental strategy

The quick explanation teaches: begin with the relationship containing the fewest unresolved values, then substitute forward. When the trace validates a coupled start, the guidance instead says to combine the smallest useful relationship set before substituting.

## 7. Equation diagnosis

The response is compared with the verified assignment and solve order. Exact value swaps get a specific swap diagnosis. Otherwise, feedback identifies the earliest incorrect variable in the verified dependency order and names the equation(s) to rework. No unsupported arithmetic-error story is inferred.

## 8. Latin improvements

Latin explanations validate and use only the target’s replayable causal proof. Direct and intermediate deductions are separated. The learner sees row candidates, column candidates, their intersection, and only required intermediate placements. The explanation engine no longer computes unrelated cells: its proof grid contains original clues, required dependency cells, and the target only.

## 9. Latin visualization

The target row/column and active proof cell use semantic labels plus visible highlighting. The final proof grid explicitly marks given clues, required proof cells, the target answer, and blanks that are not needed for the proof.

## 10. Latin diagnosis

If the selected symbol already occurs in the target row or column, feedback names that exact conflict. Otherwise, stored `eliminatedCandidates` and dependencies support an elimination-path diagnosis. When those facts do not support a stronger claim, neutral guidance is shown.

## 11. Practice feedback

Correct answers receive concise strategy reinforcement. Incorrect answers show the student answer, correct answer, and supported diagnosis where available. Timing remains visible but is never interpreted as a cause of error. Existing `explanation_opened` instrumentation is reused; no extra step-view events were added.

## 12. Review integration

Immediate practice, practice-session review, and generated mock-result review now use the same module builders and feedback components. Figure and Latin no longer fall back to raw legacy prose in generated mock review.

## 13. Immutable handling

New practice and mock snapshots persist the compact versioned educational explanation privately beside the immutable answer and reasoning trace. Student responses are not embedded in that solution model; diagnoses are derived deterministically at review time. Older snapshots without the new field remain compatible and rebuild from their immutable question plus stored reasoning trace without regenerating the question. Exact Phase 7 prose is frozen only for newly created snapshots.

## 14. Accessibility and responsive behavior

The existing responsive one-column/two-column shell, native buttons, focus rings, reduced-motion classes, progress announcements, labelled grids, and non-colour correctness icons were preserved. New quick, diagnosis, observation, and takeaway blocks are semantic text. Figure transition lists and Latin proof cells have accessible labels. Rendered browser QA could not be performed because the Browser skill’s required availability check found no in-app browser instance; component rendering, accessibility markup assertions, and production compilation were used instead.

## 15. 3,000-question audit

| Module | Accepted | Failures | Unsupported claims | Missing reasoning | Fallbacks | Supported diagnoses | Neutral diagnoses | Average steps |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Figure Sequence | 1,000/1,000 | 0 | 0 | 0 | 0 | 1,000 | 0 | 4.352 |
| Mathematical Equation | 1,000/1,000 | 0 | 0 | 0 | 0 | 1,000 | 0 | 2.999 |
| Latin Square | 1,000/1,000 | 0 | 0 | 0 | 0 | 965 | 35 | 6.399 |

Each module was balanced 334 easy, 333 medium, and 333 hard. Average steps increased by difficulty:

- Figure: 3.290 / 4.411 / 5.357.
- Equation: 2.000 / 3.000 / 4.000.
- Latin: 4.000 / 7.171 / 8.033.

## 16. Validation

Every audit item had to produce a valid `educational-explanation@1`, contain at least one referenced step, declare the correct replay source, avoid unsupported learner claims, and generate deterministic response feedback. Invalid traces return no educational model rather than fabricated reasoning.

## 17. Diagnosis coverage

The audit produced 2,965 supported diagnoses and 35 neutral diagnoses. Neutral cases were all Latin selections for which the chosen wrong symbol was not directly classifiable from the stored conflict/elimination facts. This is intentional conservative behavior, not a fallback explanation failure.

## 18. Files changed

Core implementation:

- `src/lib/practice/educational-explanation.ts`
- `src/lib/practice/figure-sequence-explanation.ts`
- `src/lib/practice/latin-square-explanation.ts`
- `src/lib/practice/native.ts`
- `src/lib/practice/schemas.ts`
- `src/lib/practice/data.ts`
- `src/lib/results/schemas.ts`
- `src/lib/results/data.ts`
- `src/components/practice/practice-explanation-shell.tsx`
- `src/components/practice/figure-sequence-practice-feedback.tsx`
- `src/components/practice/mathematical-equation-practice-feedback.tsx`
- `src/components/practice/latin-square-practice-feedback.tsx`
- `src/components/practice/practice-experience.tsx`
- `src/components/practice/practice-review.tsx`
- `src/components/results/result-review.tsx`

Audit and verification:

- `src/lib/practice/educational-explanation.test.ts`
- `src/lib/practice/phase7-explanation-audit.test.ts`
- `scripts/run-phase7-explanation-audit.mjs`
- `package.json`
- related explanation, snapshot, component, and result-review tests
- `reports/phase7/*`

No generator algorithm file was changed for Phase 7.

## 19. Database changes

No migration or schema change was required. The versioned educational model is stored inside the existing private JSON snapshot. Existing records remain readable.

## 20. Tests

Added shared-contract, deterministic diagnosis, invalid-trace, immutable snapshot, all-transition Figure, target-only Latin proof, and Figure/Latin mock-review coverage. The 3,000-question audit is reproducible with `npm run audit:phase7-explanations`.

## 21. Full regression

- ESLint: passed.
- TypeScript: passed.
- Vitest: 77 files passed; 412 tests passed; 14 audit files/22 tests skipped by their normal opt-in environment gates.
- Phase 7 opt-in audit: 3,000/3,000 passed.
- Next.js 16.3 production build: passed; 27 routes generated/validated.

## 22. Remaining weaknesses

- Figure distractors do not store intended misconception labels, so diagnosis can name the exact state mismatch but not the student’s cause.
- Equation answers are free-form assignments; beyond exact swaps and earliest wrong dependency, causal arithmetic diagnoses would require new validated response metadata.
- Thirty-five of 1,000 sampled Latin wrong answers required neutral guidance because the trace did not justify a stronger claim.
- Snapshots created before Phase 7 do not contain frozen `educational-explanation@1`; they remain deterministic from immutable data and trace, but their wording follows the current compatible builder.
- Live browser/mobile visual QA remains outstanding because no in-app browser was available in this environment.
