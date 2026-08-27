# PrepDMAT performance remediation

Date: 2026-08-28

This report separates measured evidence from static source analysis. Browser Web Vitals, authenticated end-to-end timings, production Supabase query timings, and React Profiler render counts were not available in this environment and are not estimated as measurements.

## 1. Performance architecture discovered

PrepDMAT is a Next.js 16.3.3 App Router application. Server Components load route data, Server Actions own mutations, Supabase Auth resolves identity, and service-role/server-only modules perform privileged persistence. Assessment questions are persisted as immutable public/private snapshots; grading and private answers stay server-side.

The root layout uses request-scoped `getCurrentUser()` caching and concurrently resolves authenticated profile/role data. Mock interaction is already local-first: navigation is client state, equation edits use a 350 ms latest-value debounce, saves flush at navigation/section/submission boundaries, and the one-second Mock timer is isolated. Practice intentionally generates and validates the complete session before Question 1 so no student can reach unfinished content. See `performance-audit.md` for the full route, query, timer, polling, bundle, and caching map.

## 2. Top 10 bottlenecks

| Rank | Priority | Area | Evidence | Decision |
| ---: | :---: | --- | --- | --- |
| 1 | P0 | Auth/generation rate limits | Two or three database RPC round trips were sequential on each protected operation. | Fixed |
| 2 | P1 | Diagnostic continuation | Save and advance/complete used two Server Actions; initial load duplicated a profile read. | Fixed |
| 3 | P1 | Practice timer | Parent state changed every second, invalidating the complete interactive Practice subtree. | Fixed |
| 4 | P1 | Practice start | Source context waited unnecessarily; the newly persisted session was read back with two additional queries. | Fixed |
| 5 | P1 | Mock autosave | Immutable-item validation waited for the attempt/response read phase. | Fixed |
| 6 | P1 | Practice initial bundle | All three worked-feedback implementations loaded before feedback was needed. | Fixed with #3 |
| 7 | P1 | Progress payload | Default load can request up to 10,000 Practice items, 10,000 Mock items, and 10,000 responses with JSON snapshots. | Deferred: requires an aggregation/pagination design and production query evidence |
| 8 | P2 | Dashboard Mock counts | Legitimate completed-attempt dependency leads to a second response-count phase. | Deferred: database aggregation RPC is the safe next option |
| 9 | P2 | Auth-aware root | Server-authoritative header makes public rendering dynamic. | Protected: changing it risks auth consistency |
| 10 | P3 | Verification polling | Eight-second bounded polling, at most 15 checks. | Retained: already bounded and limited to verification UX |

## 3. Top 5 actually fixed

### A. Shared security rate limiter

- **Before:** each global/account-or-user/IP bucket called `consume_security_rate_limit()` sequentially. With a trusted client IP, Login, Signup, Reset, Practice start, Diagnostic start, and Mock start used three Supabase RPC round trips before the protected operation.
- **Root cause:** correct ordering was implemented at the application/network layer.
- **Change:** `consume_security_rate_limits(jsonb)` consumes the ordered checks in one service-role-only database transaction. The application hashes the same operation/kind/value subjects and sends the unchanged rules in one RPC.
- **After:** one database RPC round trip per limiter enforcement; database work remains ordered global -> identity -> IP. Earlier allowed buckets still consume capacity if a later bucket rejects, matching the prior behavior.
- **Security/correctness:** limits, windows, hashes, trusted-IP handling, fail-closed behavior, and rejection responses are unchanged. The wrapper accepts 1-4 checks, validates through the existing limiter, and is revoked from public/anon/authenticated roles.
- **Test:** security remediation contracts verify the wrapper, bounds, grants, plural RPC use, and removal of the per-check application loop.

### B. Diagnostic save and continuation

- **Before:** Questions 1-14 required Save Server Action -> client response -> Advance Server Action; Question 15 required Save -> Complete. A normal non-final answer statically traversed ten Supabase query/RPC operations across the two actions, excluding the two auth checks. Initial diagnostic page load read onboarding profile state twice.
- **Root cause:** persistence and continuation were separately orchestrated by the client, and helpers revalidated state that the same operation had already validated.
- **Change:** one `continueDiagnosticAction` performs save first, then server-confirmed advance or completion. The persistence result carries only server-derived position/count internally, letting continuation avoid redundant current-item reads. Verified low-level advance/complete helpers reuse the ownership decision. Passing the known session ID on initial load removes the second profile lookup.
- **After:** one Server Action/auth resolution per answer. The normal non-final path is seven statically counted Supabase query/RPC operations (30% fewer than ten); the final path is five instead of six. Initial page load is three operations instead of four. Lost-response retries restore the server-owned position and never rewrite a locked answer.
- **Security/correctness:** answer-format validation, session ownership, server grading, answer locking, save-before-advance, 15-question completion, and no pre-completion correctness remain intact.
- **Test:** continuation, double-submit guard, pending/error behavior, label, no-correctness, persistence, and 5+5+5 diagnostic contracts pass.

### C. Practice start path

- **Before:** optional Mock source context began after recent-session/history reads. After atomic creation and classification, the new session and first item were selected back from Supabase in two more sequential reads.
- **Root cause:** independent context retrieval was serialized and the action reconstructed client state from a database readback even though it held the exact committed immutable inputs.
- **Change:** source context starts before recent-history lookup and joins the recent-item phase. After successful RPC persistence and category update, Question 1 state is constructed from the exact persisted manifest/session values.
- **After:** two post-create database reads are removed. Source-context latency overlaps history work when source-targeted Practice is used. Generation and validation remain unchanged and still complete before Question 1.
- **Security/correctness:** state is returned only after both persistence operations succeed. The response remains an unanswered public snapshot; private answer/trace data are not exposed. Refresh/resume continues to read the database source of truth.
- **Test:** a Practice architecture contract requires concurrent context/history handling, local committed-state construction, and no `getActivePracticeSession()` readback in the create path.

### D. Practice timer and optional feedback bundle

- **Before:** `PracticeExperience` owned one-second remaining-time state, so the question, response controls, and feedback surface rerendered on every tick. All three module feedback implementations were part of the initial Practice entry.
- **Root cause:** high-frequency state was lifted above an expensive interactive subtree; mutually exclusive post-answer UI was eagerly imported.
- **Change:** a memoized `PracticeTimer` owns its tick state and sends only the one-time expiry transition to the parent. The three worked-feedback surfaces use client-side dynamic imports with a concise loading message.
- **After:** statically, one-second updates are confined to the timer span; the parent changes only on expiry. The raw initial Practice client entry fell from 533,747 to 470,783 bytes: 62,964 bytes lower (11.8%). Three optional chunk groups of 42,239, 48,266, and 45,462 raw bytes load only when their feedback type is rendered.
- **Security/correctness:** expiry still disables answer submission, feedback data still comes only after server grading, stable equation input identity is unchanged, and visual question/SVG quality is untouched.
- **Test:** Practice UX contracts require the timer to live before/outside `PracticeExperience` and require three dynamic feedback imports.

### E. Mock autosave read phase

- **Before:** attempt and response were read concurrently, then immutable item validation required a second sequential read phase.
- **Root cause:** the item query is independent but was delayed until after the first pair returned.
- **Change:** attempt, current response, and immutable public item snapshot are loaded together with `Promise.all`.
- **After:** autosave has one database read phase instead of two; query count and all writes are unchanged. Exact network duration requires production telemetry and is not invented.
- **Security/correctness:** ownership, in-progress status, active-section timing, response-shape validation, immutable snapshot validation, latest-answer semantics, and boundary flushes remain unchanged.
- **Test:** the Mock UX contract requires the three reads in one phase and continues to verify local-first interaction, debounce status, navigation, timer isolation, and no answer reveal.

## 4. Login before/after

Local unauthenticated `/login` TTFB was 13.7-16.2 ms before and 10.6-16.0 ms in the later warm sample; HTML stayed 32,199 bytes. These local ranges are not evidence of remote Auth improvement. The evidence-backed change is the pre-auth limiter reduction from up to three RPC round trips to one. Login still validates with Zod, fails closed, calls Supabase Auth only after limiter success, and performs one `router.replace("/dashboard")` with no `router.refresh()`.

## 5. Signup before/after

Local `/register` TTFB was 11.8-15.5 ms before and 11.5-16.6 ms later; HTML stayed 34,764 bytes. Signup's global/account/IP limiter is now one RPC instead of up to three. Email confirmation, duplicate-account-safe messaging, callback behavior, and post-verification routing were not changed.

## 6. Diagnostic before/after

Initial load removes one duplicate onboarding-profile query. Each answer now makes one browser/server action rather than two, saves before movement, and reduces the normal non-final backend path from ten to seven statically identified Supabase operations. Failure remains on the current question with the selection preserved; a saved-but-unadvanced retry uses server state. No answer key, correctness, or explanation is returned before completion.

## 7. Practice initialization before/after

The application still generates, validates, fingerprints, traces, and persists all requested questions before display because immutable readiness is a product correctness property. The optimized path removes two readbacks after creation and overlaps independent source context. Existing Core Mock audit evidence places full generation at about 2,802 ms P50 / 4,487 ms P95; module generation P50/P95 is about 572/1,184 ms Figure, 586/1,270 ms Equations, and 1,506/2,465 ms Latin. Generator algorithms and thresholds were not modified.

## 8. Practice interaction before/after

Answer selection/input remains immediate local state, checking remains intentional server persistence/grading, and Next reuses already-persisted snapshots. The one-second timer no longer invalidates the parent question subtree. Worked feedback is loaded only after it is needed. No route refresh was introduced and Equation input keys/DOM identity remain stable.

## 9. Mock initialization before/after

No Mock initialization change was justified in the top five. Generated Mock content remains created, validated, transactionally persisted, and frozen before the attempt is usable. Navigation never regenerates a question. Existing generation evidence is reported above; authenticated production timing was unavailable.

## 10. Mock interaction/autosave before/after

Existing immediate local response, 350 ms latest-value debounce, and forced boundary flushes were verified and retained. The autosave validation phase now loads all three independent rows concurrently. It does not block Next, recreate attempts, grade, or generate explanations during navigation.

## 11. Dashboard before/after

No code change. Primary Dashboard reads already use safe concurrency, and recommendation computation depends on returned evidence. Recent Mock response totals retain a legitimate attempt-ID dependency. Above-the-fold progressive streaming was not added without authenticated TTFB/UX evidence.

## 12. Progress before/after

No code change. The large bounded history/snapshot reads are the strongest remaining P1 opportunity. A safe fix should introduce server-side aggregation and separately paginated drill-down data; changing it now without parity tests or production query plans could alter analytics, which is protected.

## 13. Supabase query improvements

- Limiter: 2-3 network RPC calls -> 1 batch RPC.
- Diagnostic initial load: 4 statically counted operations -> 3.
- Diagnostic normal non-final continuation: 10 -> 7 across the user action.
- Practice creation: removes 2 readback selects; overlaps independent source context/history.
- Mock save: 2 read phases -> 1, with the same three reads.

Student hot paths generally use explicit projections. Existing broad Practice reads remain server-only because grading/feedback uses their snapshots; no private snapshots were moved to the client.

## 14. Database indexes added/removed

None. Existing indexes cover the hot ownership/status/session/question/order predicates. No production `EXPLAIN (ANALYZE, BUFFERS)` access was available, so adding indexes would have been speculative and would impose write/storage cost. The new limiter wrapper reuses the existing `(scope, subject_hash)` conflict/lookup key and advisory-lock strategy.

## 15. Request waterfalls removed

Removed: per-bucket limiter network waterfall; Diagnostic client save -> advance waterfall; duplicate initial Diagnostic profile lookup; post-create Practice session -> item readback waterfall; source Mock context waiting behind recent history; Mock attempt/response -> immutable item read waterfall.

Retained intentionally: operations where ownership, persistence, grading, or dependency order matters, including save before advance, Practice creation before classification/return, and completed Mock IDs before response aggregation.

## 16. Bundle-size improvements

Measured raw initial entry JavaScript after the final analyzed build:

| Student route | Before | After | Change |
| --- | ---: | ---: | ---: |
| `/practice` | 533,747 B | 470,783 B | -62,964 B (-11.8%) |
| `/results` | 529,198 B | 535,422 B | build-to-build hash/chunk variance; no source change |
| `/tests/[testId]/take` | 453,254 B | 459,318 B | build-to-build variance; no source change |
| `/onboarding/diagnostic` | 444,218 B | 449,059 B | continuation source change plus build variance |

After remediation, Results is the largest measured student initial entry at 535,422 raw bytes; Practice is 470,783 bytes. Shared Next/React/layout UI and route-specific interactive surfaces are the principal client contributors. Generator, validator, security, and service-role modules remain behind server-only boundaries. No gzip claim is made because compressed transfer measurement was unavailable.

## 17. React rerender improvements

The evidenced high-frequency state lift in Practice was removed. Render counts were not available without React Profiler, so the report claims state-scope reduction, not invented render numbers. Existing Mock timer isolation and local navigation were verified. No broad `React.memo` campaign was performed.

## 18. Timer improvements

Practice's one-second tick is isolated in `PracticeTimer`; parent notification occurs once at zero. Mock's existing isolated `TestTimer` remains. Verification polling remains bounded to 15 checks at eight-second intervals and stops on success/timeout.

## 19. Network payload improvements

Practice avoids two full server-to-database row readbacks after creation and sends the same public Question 1 contract to the client. Initial Practice JavaScript is 62,964 raw bytes smaller. Diagnostic removes one Server Action request per answer. Mock client payload still contains only public immutable snapshots; private snapshots/answer keys remain server-side. Authenticated Practice/Mock/Progress RSC payload sizes could not be captured without a session.

## 20. Caching strategy

- **Public static:** landing/exam-format copy and public labels; normal Next route prefetch is appropriate.
- **User-specific:** Dashboard, Progress, profile, history; request-scoped only, never globally cached.
- **Immutable snapshot:** persisted Practice/Mock question snapshots; reuse, never regenerate during navigation.
- **Frequently mutating:** answers, flags, timers, attempt position; local-first where safe, background persistence, flush at boundaries.
- **Security-sensitive:** auth session, roles, rate buckets, private answers; server-authoritative, fail closed, never shared-cache.

`getCurrentUser()` remains request cached only. No cross-request user cache was introduced.

## 21. Web Vitals if measurable

LCP, FCP, CLS, INP, browser TTFB, and route-transition timing were not measurable because the browser integration reported no available browser. No analytics dependency was added merely to manufacture a measurement. Suggested production budgets remain LCP <2.5 s, CLS <0.1, local answer feedback <100 ms, and snapshot-backed navigation <200 ms, pending real-user monitoring.

## 22. Responsive/mobile findings

Interactive testing at 1440/1280/1024 and 430/375/320 was unavailable for the same browser limitation. Static review found no layout-structure change: the timer retains the same inline footprint and feedback uses the existing container. Public local HTTP responses and protected redirects remained functional. Device/throttled-network verification remains a staging task.

## 23. Security guarantees preserved

RLS, service-role boundaries, CSP, trusted-IP validation, HMAC subject hashing, fail-closed limits, server auth, ownership checks, Zod schemas, answer locks, server grading, immutable Mock snapshots, deterministic generator validation, unique-answer checks, canonical traces, and private answer separation remain. No threshold/window changed. The new migration must be applied before deploying application code because code intentionally fails closed if its batch RPC is absent.

## 24. Tests/build results

- `npm run lint`: passed.
- `npm run typecheck`: passed.
- Focused performance/security regressions: 43/43 passed.
- Initial `npm test`: 656 passed, 1 timed out, 27 skipped; the unchanged CPU-heavy hard-equation test exceeded 20 s under the fork pool, and Vitest reported a fork-worker RPC timeout.
- Same frozen generator file with the thread pool: 16/16 passed cleanly. The standard single-worker test script now uses the thread pool. A separate 300-sample fidelity audit measured 23.35 s once against its explicit 20 s harness limit, so only that test timeout was raised to 30 s; sample count, assertions, generator code, and production thresholds are unchanged.
- Final `npm test`: passed — 118 files and 657 tests passed; 17 opt-in audit files / 27 tests remained skipped by their existing contracts.
- `npm run build`: passed with Next.js 16.3.3. The analyzed build compiled in 4.6 s and completed in 17.3 s; the final gate compiled in 11.6 s with TypeScript in 6.8 s and all 32 static-generation tasks completed. Build-time variance was retained rather than presented as a runtime gain.
- `npm audit --audit-level=low`: passed, 0 vulnerabilities (registry access required the approved network retry).
- `git diff --check`: passed; line-ending notices only.

## 25. Remaining performance opportunities

1. Add production Real User Monitoring for Web Vitals using existing/lightweight infrastructure.
2. Capture Vercel function and Supabase query timings, plus deployment-region distance.
3. Redesign Progress around server aggregation and paginated drill-down payloads with analytics parity tests.
4. Consider a Dashboard response-count aggregation RPC only after `EXPLAIN` and authenticated timing.
5. Profile Results (now the largest initial student entry) and Progress charts with bundle attribution before splitting anything.
6. Run the eight specified authenticated flows and the desktop/mobile/throttled matrices in staging with a connected browser.

## Verdict

**PERFORMANCE IMPROVED — MORE WORK RECOMMENDED**

The highest-confidence network waterfalls, timer rerender scope, and Practice bundle issue were improved without weakening assessment or security guarantees. Production Web Vitals, authenticated staging timings, Progress payload redesign, and region/query evidence remain necessary before an “excellent” rating is defensible.
