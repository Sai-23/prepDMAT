# PrepDMAT performance audit

Date: 2026-08-27

## Evidence rules

- **Measured** means captured from the untouched production build, local production HTTP responses, or an existing checked-in benchmark artifact.
- **Statically identified** means derived from source control-flow, query count, payload projection, or build manifests. Network timings are not invented.
- Browser Web Vitals and interactive render profiles were not measurable because no in-app or extension browser was connected. Authenticated route timing was also unavailable without a test session.

## Architecture map

PrepDMAT uses Next.js 16.3.3 App Router. Pages and layouts are Server Components unless marked `use client`; mutations use Server Actions; Supabase Auth uses `@supabase/ssr`; privileged persistence and immutable assessment snapshots use server-only Supabase service-role clients and security-definer RPCs.

Student routes include `/`, `/exam-format`, `/login`, `/register`, `/forgot-password`, `/reset-password`, `/dashboard`, `/onboarding`, `/onboarding/diagnostic`, `/onboarding/diagnostic/summary`, `/practice`, `/practice/review/[sessionId]`, `/tests`, `/tests/[testId]`, `/tests/[testId]/take`, `/results`, `/progress`, `/bookmarks`, `/mistakes`, and `/profile`. Route-level loading boundaries already exist for Dashboard, Onboarding, Practice, Progress, Results, and Tests.

The root layout resolves request-cached Supabase user state and, for authenticated users, loads profile/theme and roles concurrently. Authenticated pages reuse `getCurrentUser()` through React request caching. Dashboard, Practice landing, Progress history roots, Mock attempt payload reads, and several Admin metrics already parallelize independent database requests.

Interactive Client Components are concentrated in authentication forms, onboarding/diagnostic, Practice, Mock Test runner, result review, learning libraries, and Admin tools. Mock Test navigation is local and immutable-snapshot backed. Mock equation saves use a 350 ms latest-value debounce and flush on navigation/submission. The Mock timer is already isolated in a memoized child.

## Baseline measurements

### Production build

- **Measured:** clean production build completed in 11,216.7 ms locally.
- **Measured from Next build manifests (raw, uncompressed entry JavaScript including the shared layout):**

| Route | Raw entry JavaScript |
| --- | ---: |
| `/practice` | 533,747 bytes |
| `/results` | 529,198 bytes |
| `/tests/[testId]/take` | 453,254 bytes |
| `/onboarding/diagnostic` | 444,218 bytes |
| `/login` and `/register` | 318,044 bytes each |
| `/dashboard` and `/progress` | 305,344 bytes each |

The shared root entry accounts for approximately 299,975 raw bytes. Practice adds approximately 233,772 route-specific raw bytes, the largest measured student route increment.

### Local production HTTP

Five warm local requests, with no external network latency:

| Route | TTFB range | HTML/RSC response size |
| --- | ---: | ---: |
| `/` | 22.9-78.5 ms | 42,272 bytes |
| `/exam-format` | 26.1-80.0 ms | 72,030 bytes |
| `/login` | 13.7-16.2 ms | 32,199 bytes |
| `/register` | 11.8-15.5 ms | 34,764 bytes |

Unauthenticated requests to Dashboard, Practice, Progress, and Tests returned a 307 redirect to Login in 3.0-4.3 ms locally. These numbers are useful only as local server baselines; they do not represent Vercel-to-Supabase latency or mobile Web Vitals.

### Generator evidence

Existing release audit telemetry reports a full generated Core Mock P50/P95 of approximately 2,802/4,487 ms under its audit load. Module P50/P95 values are approximately 572/1,184 ms for Figure Sequences, 586/1,270 ms for Mathematical Equations, and 1,506/2,465 ms for Latin Squares. This makes generation material to start latency, but no correctness/quality gate is eligible for removal. The generation algorithms are therefore protected from this remediation.

## Top ten bottlenecks

| Rank | Priority | Route/area | Evidence and root cause | Selected |
| ---: | :---: | --- | --- | :---: |
| 1 | P0 | Login, Signup, reset, generation starts | Up to three `consume_security_rate_limit` RPCs execute sequentially before the protected operation. Each RPC is a separate network round trip. | Yes |
| 2 | P1 | Diagnostic answer navigation | Questions 1-14 require a save Server Action and then an advance Server Action; final completion similarly crosses the client/server boundary twice. The route also reads onboarding profile state twice on initial load. | Yes |
| 3 | P1 | Practice timed sessions | One-second state lives in `PracticeExperience`, rerendering the session question/answer/feedback subtree on every tick. | Yes |
| 4 | P1 | Practice initialization | After atomic persistence and classification, the action re-reads the new session and first item in two more sequential database requests. Mock context loading also starts after recent-history loading despite being independent. | Yes |
| 5 | P1 | Mock autosave | Attempt/response reads are parallel, but immutable item validation waits for both even though it is independent, adding one database round trip to every save. | Yes |
| 6 | P1 | Practice bundle | `/practice` adds about 233.8 KB raw route JavaScript and eagerly includes all three worked-feedback implementations before any answer is checked. | Included with Practice render fix |
| 7 | P1 | Progress | The default view can fetch up to 10,000 Practice items, 10,000 Mock items, and 10,000 responses including large JSON snapshots, then computes detailed analytics before a collapsed disclosure is opened. | Deferred |
| 8 | P2 | Dashboard recent Mock scores | Response totals run after primary/progress/availability work and perform an ownership query followed by a response query. The dependency on completed attempt IDs is legitimate; a database aggregation RPC would be needed to collapse it safely. | Deferred |
| 9 | P2 | Public/root rendering | Root server auth resolution makes public pages request-dynamic and dependent on Supabase Auth so the header is server-authoritative. Removing it would regress auth consistency. | Protected |
| 10 | P3 | Verification monitor | Bounded 8-second polling can issue up to 15 local auth checks over roughly two minutes. It is confined to the post-signup screen and already stops on success/timeout. | Leave |

## Supabase and index review

Hot-path projections are generally explicit. Remaining `select("*")` calls are concentrated in Practice session/item reads and Admin analytics; the Practice readbacks selected for removal eliminate two such hot-path reads at session start. Progress intentionally has hard row limits but still has the largest potential JSON payload.

Existing indexes cover user roles; question publication/type; test sections/mappings; user attempt status; response attempt/question keys; active and historical Practice sessions; Practice item session/position; generated Mock history; and rate-limit cleanup. No new index is justified without production `EXPLAIN (ANALYZE, BUFFERS)` evidence, so this phase will not add one blindly.

## Cache and revalidation classification

| Data class | Examples | Strategy |
| --- | --- | --- |
| Public static | Landing copy, Exam Format, navigation labels | Prerender where auth-aware root layout permits; use normal Next Link prefetch |
| User-specific | Dashboard, Progress, profile, bookmarks, mistakes | Request-scoped only; never global cache |
| Immutable snapshot | Practice/Mock public and private attempt snapshots | Persist once; reuse during navigation; never regenerate or expose private snapshots |
| Frequently mutating | Answers, flags, timers, attempt position | Local-first UI where safe; bounded background persistence; flush on boundaries |
| Security-sensitive | Auth sessions, roles, rate-limit buckets, answer keys | Server-authoritative, fail closed, no shared/global cache |

## Environment limitations and infrastructure

No connected browser was available, so LCP, FCP, CLS, INP, React Profiler render counts, mobile viewport interaction, and throttled-network behavior are unmeasured. Vercel and Supabase deployment regions are not declared in the repository, so geographic latency cannot be determined statically and no infrastructure migration is proposed.
