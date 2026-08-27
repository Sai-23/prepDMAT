# Generator and Admin metrics audit

Date: 2026-08-21 (Asia/Calcutta)

## Root causes

The generation foundation was stronger than the reported symptoms suggested: all three modules already used a centralized seeded PRNG, independent solvers, validators, deterministic replay, bounded retries, and semantic fingerprints. The structural variety bottlenecks were narrower:

- Figure Sequences simulated frames procedurally, but `createRules` selected one fixed rule recipe per difficulty and varied mostly direction, colour, and starting state.
- Mathematical Equations selected one of twelve explicit family builders. The family name changed, but each builder fixed the dependency and deduction path.
- Latin Squares generated clue positions, but its structural fingerprint did not treat row/column permutations as cosmetic and the acceptance pipeline rejected semantic duplicates only.
- Figure and Latin pipelines had exact-fingerprint protection but no structural-similarity comparison. Equation generation had exact structural signatures but no graded similarity or protected reference profile.
- The repository contains no official/reference question bodies or normalized Figure/Latin reference descriptors. The only reference structure that can be verified from the supplied brief is the two-variable scale-plus-difference example. It is stored only as a normalized reasoning profile.

The Admin overview failed for a separate reason. The live database has not applied `202608140015_mock_template_versions.sql`, so `test_sections.is_current` does not exist. `getAdminMetrics()` queried that column while calculating Published mocks. Because the six cards were fetched as one unit, that one PostgreSQL `42703` error made the entire overview unavailable.

## Architecture change

Before:

`difficulty -> fixed family/recipe -> cosmetic parameters -> solve -> validate -> exact duplicate check`

After:

`seeded primitives -> compatible rule/graph composition -> hidden solution/state -> simulate/solve independently -> validate uniqueness and difficulty -> normalized structural profile -> reference and recent similarity -> accept/retry`

The new shared novelty policy uses weighted normalized fields. Categorical fields compare exactly, numeric fields use normalized distance, and rule arrays use multiset Jaccard similarity. Reference candidates are rejected at similarity `>= 0.85`; recent candidates are rejected at `>= 0.94`. Exact semantic fingerprints remain a separate database and pipeline guard.

## Implemented rule primitives

### Figure Sequences

- Linear horizontal, vertical, and diagonal movement
- Border traversal in either direction
- Direction cycles
- Fixed and incrementing step progression
- Bounce boundary handling
- Fixed/incrementing clockwise or counter-clockwise rotation
- Seeded colour cycles with normalized colour identity
- One to four independent object streams selected by difficulty
- Compatibility-aware border placement and collision rejection
- Simulated correct frames and one-object plausible-error distractors

### Mathematical Equations

- Solution-first integer assignments in the official 1–20 domain
- Coupled entry equations generated from compatible linear relationships
- Chain, star, merged, branch/recombine, and mixed dependency graphs
- One- and two-parent derived relationships with addition, subtraction, and safe constant coefficients
- Equation-side and display-order randomization that does not affect structure
- Independently verified unique complete solutions and verified step-by-step deductions
- No per-reference or twelve-template registry remains

### Latin Squares

- Complete 5x5 Latin square first, followed by seeded row, column, and symbol permutations
- Target selection and strategic clue placement
- Independent completion solver and target-uniqueness proof
- Logical singles/only-position deduction trace with depth, round, and dependency metrics
- Row/column-permutation-canonical clue geometry

## Structural normalization

- Figure profiles ignore object identifiers, shapes, initial position/orientation, and colour names. They retain object count, movement class, step progression, boundary behavior, rotation behavior, colour-cycle length, and rule composition.
- Equation profiles ignore variable names, equation order, constants, and exact coefficient values. They retain variable/equation count, dependency graph, relationship/operator shapes, substitution loads, solve modes, and dependency depth.
- Latin profiles ignore symbol names and canonicalize every clue mask with the target fixed before comparing all remaining row/column permutations. They retain the canonical clue pattern, clue count, initial candidates, deduction depth/round/classification, dependency balance, and deduction-reason multiset.

Generation metadata now persists the semantic fingerprint, normalized rule fingerprint, structural profile, similarity results, seed, generator/validator versions, requested/calculated difficulty, attempt number, and timestamp. Database grants already prevent student clients from selecting `questions.metadata`; protected answer and generation internals continue to be projected only by server-side DTOs.

## 6,000-question diagnostic

The reproducible command is `npm run audit:generation-diversity`. Full machine-readable and Markdown results are in `reports/generator-health.json` and `reports/generator-health.md`.

Diversity score formula:

`100 * (0.35 * uniqueStructuralRatio + 0.35 * normalizedRuleEntropy + 0.30 * (1 - recentNearCloneRateAt0.90))`

| Module | Accepted | Exact duplicates | Unique structures | Structural duplicate rate | Largest structure share | Near-clone rate (>=.90) | Diversity score |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Figure Sequences | 2,000 | 0 | 788 | 60.60% | 10.95% | 0.00% | 71.9735 |
| Mathematical Equations | 2,000 | 0 | 424 | 78.80% | 15.10% | 3.75% | 69.3869 |
| Latin Squares | 2,000 | 0 | 1,913 | 4.35% | 0.20% | 4.95% | 96.9917 |

Difficulty distribution was 667 Easy / 667 Medium / 666 Hard in every module. Equation graph distribution was coupled pair 667, star 322, merged 325, chain 284, mixed 214, and branch/recombine 188. Figure object counts were 448 one-object, 268 two-object, 766 three-object, and 518 four-object questions. Latin average target deduction depth was 2.0075.

The supplied mathematical reference profile had maximum similarity 0.7895 and mean similarity 0.4865; counts above 0.90, 0.80, and 0.70 were 0, 0, and 667. Figure/Latin reference similarity is marked not tracked because their source reference structures are absent from the repository; inventing those values would be misleading.

Weak areas:

- Easy two-variable equation mechanics necessarily cluster; the largest normalized equation structure represents 15.10% of the balanced audit.
- One-object/simple Figure mechanics produce a largest cluster of 10.95%.
- Latin difficulty targeting is inefficient: 19,554 of 21,577 candidates failed validation/difficulty selection before 2,000 were accepted (90.62%). No invalid candidate was accepted, but clue removal should be made more goal-directed in a later optimization.
- Actual Figure/Latin reference profiles must be supplied before their reference-protection coverage can be measured.

## Admin metric inventory and live verification

The UI is the server component `src/app/admin/page.tsx`; it has no client hook or fake state. It calls the server-only `getAdminMetrics()` data-access function, which uses the service-role Supabase client after `requireRole(["reviewer", "admin"])` authorizes the page on the server. Every count uses `head: true, count: "exact"`; query errors are checked before nullable counts are converted to real zeroes.

| Metric | UI | Query/table | Expected/live database | Status |
| --- | --- | --- | ---: | --- |
| Total users | Admin card | exact count, `profiles` | 2 / 2 | WORKING |
| Total questions | Admin/reviewer card | active Core count, `questions` | 6 / 6 | WORKING |
| Awaiting review | Reviewer card | `questions.verification_status=under_review` | 0 / 0 | WORKING |
| Approved drafts | Reviewer card | approved + draft `questions` | 0 / 0 | WORKING |
| Published questions | Admin/reviewer card | published active Core `questions` | 6 / 6 | WORKING |
| Open reports | Admin/reviewer card | open `question_reports` joined to Core `questions` | 0 / 0 | WORKING |
| Published mocks | Admin/reviewer card | published Core `tests`, excluding practice system test | 1 / 1 | FIXED (was WRONG QUERY / 42703) |
| Generated questions | Admin card | active generated Core `questions` | 6 / 6 | WORKING |
| Generated today (UTC) | Admin card | generated `questions.created_at >= UTC midnight` | 0 / 0 | WORKING |
| Total attempts | Admin card | exact count, `test_attempts` | 29 / 29 | WORKING |
| Completed attempts | Admin card | submitted + auto-submitted `test_attempts` | 29 / 29 | WORKING |
| Generated by type | Admin distribution | three exact filtered `questions` counts | Figure 0, Equation 6, Latin 0 | WORKING |
| Generated by difficulty | Admin distribution | three exact filtered `questions` counts | Easy 3, Medium 3, Hard 0 | WORKING |

No dashboard values are mock, placeholder, random, or hard-coded. The missing migration remains relevant to Mock Builder versioning, but the overview no longer depends on that unrelated column.

## Security, database, and unsupported telemetry

- No migration was added or applied. Existing `questions.metadata` JSONB stores the additional generation fields.
- Service-role credentials remain in `server-only` code and are never returned to the browser.
- The Admin page, generator Server Actions, and analytics export Route Handler all perform server-side role checks. RLS remains enabled; no policy was weakened.
- Mutations continue to call `revalidatePath("/admin")`, so counts refresh after generation publication, question lifecycle changes, and mock changes without polling.
- Generation success/failure rate, duplicate rejection count, validation failure count, average generation time, and historical rule coverage are **NOT CURRENTLY TRACKED** in the database. The development audit can calculate them in-process, but production history would require a small server-written generation-events table or aggregate RPC. No historical values were fabricated.
- Average score is not added to the overview because the current PostgREST surface has no aggregate RPC and downloading all attempts to average them would violate the efficient-query requirement.
