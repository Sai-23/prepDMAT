# PrepDMAT Student Experience Remediation v2

## Sticky Action Root Cause

The static `calc(100dvh - 5rem)` assessment height was nested beneath a real site header and workspace padding/heading. It bounded the component independently of its actual flex allocation, leaving the body scrollable and allowing the component's final action child to fall below the viewport. The fix establishes one continuous `min-height: 0` flex chain from the `100dvh` app frame through site main, focused workspace content, and `AssessmentShell`.

## Scroll Architecture

Before: body scroll plus assessment question scroll, with outer workspace content contributing height.

After: while `[data-focused-assessment]` exists, the app frame is `100dvh`, body/site-main/workspace overflow is suppressed, the sidebar and workspace heading are removed from the active assessment, and `AssessmentShell` fills the available main area. Its header and action zone are `shrink-0`; only `[data-assessment-scroll-region]` uses vertical scrolling.

The action bar remains in normal flex layout rather than fixed positioning, so it does not cover Equation inputs or feedback when a mobile keyboard changes the dynamic viewport.

## Figure Sequence Layout

Matrices and gaps now use `clamp()` sizing. The strip uses `w-max min-w-full` with centered content and a dedicated `max-w-full overflow-x-auto` boundary. Wide workspaces can show the full sequence; narrower screens scroll only the sequence strip. Candidate grids remain readable rather than being globally scaled down or clipped.

## Selection Visibility

Figure, Latin, and generic single-choice answers now use radio/radiogroup semantics and `aria-checked`. Selected states combine a stable two-pixel border, accent tint, visible ring, and check/Selected indicator. Correctness colors and labels are used only after Practice feedback or in completed review; active Mock and Diagnostic selections do not reveal correctness. Border widths are reserved in neutral and selected states to avoid layout shift.

## Focused Assessment Mode

The workspace sidebar and page heading are hidden only when an active assessment shell is rendered. Practice, Diagnostic, and Mock gain question-first width while the rest of the product retains normal navigation. Practice Exit confirms abandonment; Diagnostic has a direct resumable Dashboard exit; Mock Exit flushes pending responses and confirms before leaving.

## Horizontal Overflow

The fix addresses min-content width directly with responsive matrices/gaps and recovered sidebar width. Horizontal overflow remains available only on the intentional Figure Sequence strip when the viewport is too narrow; no workspace-level clipping was added.

## Mobile Assessment

The app uses `100dvh`, one content scroller, compact action padding, `env(safe-area-inset-bottom)`, and a full-width primary-only action grid. Fixed overlays were avoided, protecting Equation input and virtual-keyboard behavior. Mobile Mistake filters collapse behind one keyboard-accessible `Filters` disclosure.

## Diagnostic completion

Before: the header always showed `Free Diagnostic`; completed `/onboarding` visits redirected unexpectedly to Dashboard.

After: the existing profile `diagnostic_status` is fetched alongside the existing root profile query. Navigation resolves to `Free Diagnostic`, `Resume Diagnostic`, or `Diagnostic Complete ✓` and the completed destination is the existing summary. `/onboarding` also routes completed users to that summary. Dashboard shows Take, Resume, or completed/View Results state without recommending a retake.

## Mistake Notebook repair

The data loader now reads bounded incorrect history from completed `practice_session_items` (Practice and Diagnostic) and submitted Mock `user_responses` joined to immutable `practice_attempt_items`, with a canonical legacy fallback. Private snapshots are interpreted only on the server to derive the correct answer and explanation; only completed Diagnostic sessions are eligible, preventing early correctness exposure.

The result is filtered on the server and paginated to 20 cards. Source queries are bounded; no unlimited client-side history is loaded.

## Understood workflow

`Needs review` is the default. Marking an item understood changes the card immediately, persists through the existing secure server-action boundary, and removes it from a status-specific queue after success. A failure restores the prior state, retains the note/current card, shows a safe error, and exposes Retry. The workflow does not use `router.refresh`, alter grading, or mutate the saved assessment response.

## Filters

Reliable URL-backed filters cover status, module, difficulty, and source (Practice, Diagnostic, Mock). Desktop shows a compact inline filter row; mobile uses one `Filters` disclosure. Server-side combination and pagination preserve a bounded payload. Empty history and an empty unresolved queue have distinct messages.

## Practice incorrect families removal

Removed from:

- Practice completion family-targeted CTA and follow-up copy.
- Practice review family-targeted CTA.
- Practice review raw family/reasoning-classification metadata.
- Mock question-review family-targeted CTA, replaced with `Practice this module`.
- Mock recommendation navigation parameters that targeted internal family IDs; recommendations now start ordinary module practice.

Internal `incorrectFamilies`, skill evidence, and reasoning classifications remain in backend models for analytics, generation, and ranking.

## Progressive disclosure

- Mistakes show module, question preview, latest/correct answer, review state, source/difficulty/date first; full native question, explanation, note, and actions live under `Review`.
- Mock Result keeps result, section performance, and next action visible; insights, repeated skill losses, and timing live under `View detailed analysis`.
- Diagnostic Summary shows starting result, strongest area, area to build, and recommended practice first; module detail and observations live under `View diagnostic detail`.
- Progress retains its existing `View detailed breakdown` for skills, difficulty, timing, source mix, and history.

## Data removed

- Practice completion/review removed duplicate Score and Correct metrics, retaining Accuracy, Mistakes, and Average time.
- Results history removed recorded-time metadata and uses compact View Result rows.
- Mock result removed top-level recorded-time and mock-type cards; timing remains available in detailed analysis.
- Mistakes removed three analytics-style summary cards and the always-expanded explanation/note/action payload.
- No assessment records, analytics inputs, generator data, subscription/security infrastructure, or grading data were deleted.

## Cognitive load audit

| Screen | Before | After | Primary improvement |
| --- | --- | --- | --- |
| Dashboard | Medium | Low-Medium | Authoritative Diagnostic state joins existing resume-first next-action hierarchy. |
| Practice | High | Medium | Focused viewport, obvious selection, persistent action, three essential completion metrics. |
| Diagnostic | Medium-High | Medium | Persistent save-before-advance action and honest completion navigation/result hierarchy. |
| Mock | High | Medium | Focused viewport and detailed analysis disclosure keep result/section/next action first. |
| Progress | Medium | Medium-Low | Existing one recommendation plus detailed-breakdown disclosure retained. |
| Results | High | Medium | Compact history; detailed Mock patterns and timing disclosed on demand. |
| Mistakes | High | Medium-Low | Actual three-source revision queue, unresolved-first filters, progressive Review. |
| Bookmarks | Low-Medium | Low | Added module filter beside difficulty without analytics duplication. |

## Accessibility

Answers expose radiogroup/radio roles and `aria-checked`; selected status does not rely on color. The persistent action maintains visible focus and disabled state. Mistake filter labels are explicit, disclosures use native keyboard/expanded semantics, status/error messages use status or alert roles, and timer live-region isolation remains unchanged.

## Migration and security

`202608280025_mistake_notebook_sources.sql` makes the existing canonical question reference nullable and adds optional foreign keys to Practice/Diagnostic and Mock snapshot items, constrained so exactly one source is present. Partial unique indexes prevent duplicate user/source entries. The existing `mistake_notebook_access` RLS policy remains authoritative; browser clients still do not read private snapshots. Server mutations validate assessment ownership, completion/submission state, and incorrect response state before updating notebook metadata.

## Bundle comparison

| Route | Before raw | After raw | Change |
| --- | ---: | ---: | ---: |
| Practice | 465,913 B | 465,282 B | -631 B |
| Mock | 454,512 B | 457,374 B | +2,862 B |
| Diagnostic | 444,255 B | 446,250 B | +1,995 B |
| Mistakes | 315,988 B | 322,040 B | +6,052 B |
| Dashboard | 305,398 B | 305,883 B | +485 B |
| Progress | 305,398 B | 305,883 B | +485 B |

The small Mock/Diagnostic increases are the focused Exit/selection/navigation state. The Mistakes increase covers its revision-queue state and filters; the native question renderer was split into a dynamic chunk so it does not inflate the initial route from roughly 316 KB to roughly 450 KB. Dashboard and Progress share the 485-byte diagnostic-aware header increase. No UI framework, chart library, animation library, form framework, or global state dependency was added.

## Verification

Final gates:

- `npm run lint`: passed with zero warnings.
- `npm run typecheck`: passed.
- Focused remediation suite: 78 passed.
- Focused security/ownership suite: 38 passed.
- Full regression: 675 passed, 27 opt-in skipped (13 new passing tests over the 662-pass baseline).
- `npm run build`: passed; all application routes compiled and page data completed.
- `npm audit --audit-level=low`: passed, 0 vulnerabilities.
- `git diff --check`: passed (Git emitted only existing line-ending conversion warnings).

Browser viewport and screenshot verification could not be performed because the in-app browser runtime had no available browser; manual checks remain required at the specified desktop, tablet, and mobile widths.
