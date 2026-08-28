# PrepDMAT assessment and authentication UX remediation

Date: 2026-08-28

## Executive verdict

UX IMPROVED — MINOR ISSUES REMAIN

The production-blocking Practice start experience is remediated and all automated release gates pass. The remaining issue is verification coverage, not a known functional regression: the in-app browser integration had no connected browser, so authenticated visual checks at the requested viewport sizes and cross-browser checks could not be executed in this environment.

## Root cause of “Unable to start practice right now.”

The generic message was emitted by `startPracticeAction` after `createPracticeSession` threw. Live schema/state inspection, using aggregate non-PII metrics only, found one active assessment and identified it as a Diagnostic session. The database RPC `create_practice_session` correctly enforces one active Practice/Diagnostic assessment per user and raised `active_practice_session_exists`.

The defect was in the route-level experience:

1. `/practice` restored only non-Diagnostic Practice sessions.
2. It did not inspect the user's onboarding state before offering a new Practice start.
3. Starting Practice while the Diagnostic was active reached the database guard.
4. The conflict was thrown as a plain `Error`, so `safeActionFailure` replaced it with the generic message.

This was not caused by question generation, provider configuration, missing tables, or an unavailable RPC. The live audit confirmed the required Practice tables and RPC contracts are present, service access works, anonymous access remains denied, and the batch security rate-limiter RPC is deployed.

## Remediation

- `/practice` now loads onboarding state in the existing parallel data-fetch phase. An in-progress Diagnostic redirects to `/onboarding/diagnostic`, where it resumes through the existing server-owned state.
- Race/cross-tab active-session conflicts now return a safe, actionable public error while preserving the database constraint.
- The one-active-assessment rule, ownership checks, RLS, rate limits, and generator behavior were not weakened.
- The live schema audit now includes the batch rate-limit RPC contract and aggregate active-assessment state, without logging identifiers, response content, or secrets.

## Shared assessment interaction contract

A shared `AssessmentShell` and `AssessmentActionZone` now provide:

- a stable header;
- one bounded, independently scrolling question-content region;
- a bottom action zone outside that scroll region;
- safe-area bottom padding;
- mobile stacking and 44px-or-larger primary navigation targets;
- scroll reset when moving to a new question;
- no footer or duplicate workspace heading during a focused assessment.

The action area does not overlay question content and does not use fixed page positioning.

### Practice

- `Check answer` remains the primary action before feedback.
- `Next question` or `Finish practice` becomes the primary action after feedback.
- Report-question remains tertiary.
- Errors keep the current answer/question and provide an explicit retry.
- Question inputs remain locked after checking.
- Ctrl/Cmd+Enter behavior remains, including blocking submission after timer expiry.

### Diagnostic

- The existing single `Save & Continue` / `Finish Diagnostic` action is retained.
- Persistence is still confirmed before advancement.
- Pending state disables response mutation and the primary action.
- Failure keeps the selected answer and current question and exposes Retry.
- Correctness and explanations remain hidden until completion.
- The existing 15-question, 5+5+5 contract is unchanged.

### Mock

- Previous and the contextual Next / End Section & Continue / Submit Test actions remain continuously accessible.
- Mark for review remains tertiary.
- Navigator targets are at least 44px.
- Autosave queueing, flush-before-transition, confirmation dialogs, and submit semantics are unchanged.
- Save failure keeps the current response visible and exposes Retry.

### Timers and render stability

- Practice and Mock timers remain isolated memoized components.
- The one-second display is now exposed with `role="timer"` and a current-value label instead of an `aria-live` announcement every second.
- No route-level refresh or remount loop was introduced.
- Mathematical Equation response state and Mock autosave queues were not rewritten.

### Login and registration

- Forms use tighter vertical rhythm and reduced page padding for short screens.
- Registration has a clearer PrepDMAT-specific heading.
- Primary actions remain full-width, at least 44px high, and in normal document flow so they can scroll above a mobile keyboard.
- Inline field errors are announced with `role="alert"`.
- Authentication actions, consent capture, callback handling, and security policy are unchanged.

## Responsive and manual verification matrix

| Surface | Structural/automated result | Manual browser result |
| --- | --- | --- |
| 1366×768 | Stable header/content/action structure covered | Not run — no connected in-app browser |
| 1920×1080 | Stable header/content/action structure covered | Not run — no connected in-app browser |
| 320px mobile | Full-width action stacking and safe-area rules covered | Not run — no connected in-app browser |
| 375px mobile | Full-width action stacking and safe-area rules covered | Not run — no connected in-app browser |
| 430px mobile | Full-width action stacking and safe-area rules covered | Not run — no connected in-app browser |
| Short laptop / browser zoom | Bounded scroll region and action-zone contract covered | Not run — no connected in-app browser |
| Chromium / Firefox / WebKit | Standards-based CSS and semantic contract covered | Cross-browser run unavailable |

## Performance impact

- No serial Practice data-fetch waterfall was added; onboarding state joins the existing `Promise.all`.
- No new timer-driven parent render was added.
- Production build completed successfully.
- Practice client entry JavaScript is 465,913 raw bytes across 8 emitted files, compared with the prior 463,048-byte baseline: +2,865 bytes (+0.62%). This is the small shared shell/error UI cost, with no new external dependency.

## Tests added or updated

- Shared assessment shell/action-zone render contract.
- Practice active-Diagnostic resume route and actionable conflict contract.
- Practice persistent action, timer, feedback, and error contracts.
- Diagnostic action-zone, pending, save-before-advance, resume, and final-question contracts.
- Mock persistent navigation, 44px navigator, timer, and autosave contracts.
- Auth compact normal-flow CTA and inline error semantics contract.

## Verification results

- `npm run lint`: PASS
- `npm run typecheck`: PASS
- Targeted UX/assessment/auth tests: PASS — 45/45
- `npm test`: PASS — 662 passed, 27 skipped by existing opt-in audit configuration
- `npm run build`: PASS — Next.js 16.3.3 production build, 32/32 static pages generated
- `git diff --check`: PASS (line-ending warnings only; no whitespace errors)
- Live schema/security/state audit: PASS; aggregate state identified one active Diagnostic and no active standard, targeted, or exact-review Practice sessions

## Files changed

- `scripts/run-phase12-live-schema-audit.mjs`
- `src/app/globals.css`
- `src/app/login/page.tsx`
- `src/app/practice/page.tsx`
- `src/app/register/page.tsx`
- `src/app/practice/practice-route.contract.test.ts`
- `src/components/assessment/assessment-shell.tsx`
- `src/components/assessment/assessment-shell.test.tsx`
- `src/components/auth/auth-form.tsx`
- `src/components/layout/workspace-shell.tsx`
- `src/components/onboarding/diagnostic-experience.tsx`
- `src/components/onboarding/diagnostic-experience.test.tsx`
- `src/components/practice/practice-experience.tsx`
- `src/components/practice/practice-ux-contract.test.tsx`
- `src/components/shared/action-error.tsx`
- `src/components/tests/test-runner.tsx`
- `src/components/tests/mock-ux.contract.test.ts`
- `src/lib/auth/auth-contract.test.ts`
- `src/lib/onboarding/data.ts`
- `src/lib/practice/data.ts`

## Frozen scope confirmation

No Core generator, grading, analytics calculation, question-count, difficulty, RLS policy, security threshold, or Mock autosave architecture was modified.
