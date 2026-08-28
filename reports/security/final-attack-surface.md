# PrepDMAT Final Attack Surface

Audit date: 2026-08-29 (Asia/Kolkata)

Application: Next.js 16.3.3 / React 19 / Supabase Auth + Postgres

Audit model: confidentiality, integrity, availability, and cost abuse

## Scope and evidence

This inventory treats every browser value as attacker-controlled. It covers all App Router pages, 43 exported Server Actions, four route handlers, direct Supabase browser usage, 28 public tables, Postgres functions/RPCs, authentication/provider boundaries, cookies, environment variables, dynamic parameters, redirects, request bodies, and state machines.

Evidence came from repository-wide source and migration review, static security contracts, adversarial Vitest suites, tracked-file and Git-history secret scans, a read-only live Supabase schema/RPC probe, and a local HTTP header probe. The configured `NEXT_PUBLIC_APP_URL` resolves to `http://localhost:3000`; therefore production TLS, CDN/cache behavior, authenticated RSC payloads, hosted Auth settings, provider budgets, backups, and dashboard controls are **NOT VERIFIED**. The in-app browser was unavailable, so no signed-in browser session was inspected.

## Trust boundaries

| Boundary | Trusted for | Never trusted for | Enforcement |
|---|---|---|---|
| Browser / React client | Display and interaction only | IDs, roles, ownership, answers, score, timer, completion, entitlement, hidden/disabled fields | Zod schemas, fresh server auth, ownership queries, immutable snapshots, DB RPC locks |
| Next.js server | Application authorization and orchestration | Caller-supplied identity or provider output | `requireUser`, `requireRole`, safe errors, server-only modules |
| Supabase anon client | Auth bootstrap/public token use | Data authorization or privileged mutation | RLS plus effective grants; no direct question-bank read after migration 027 |
| Supabase authenticated client | Fresh user session and narrow role/profile/attempt-summary reads | Admin authority, score, subscription state, private snapshots | RLS, column/table grants, server actions |
| `service_role` | Server-only DB workflows | Browser/client bundle or public logs | `server-only`, non-public env name, no client import, privileged RPC grants |
| Postgres | Atomic ownership/state invariants | Application-provided grading manifest without row/payload verification | RLS, grants, constraints, triggers, advisory/row locks |
| Supabase Auth | Credential/OAuth/OTP verification | Redirect destinations or app roles | Fixed callback destinations; roles loaded from DB |
| SMTP/SMS provider | Delivery of Supabase Auth messages | Account-existence disclosure | generic resend/reset responses; application and provider throttles |
| Vercel/reverse proxy | TLS termination and trusted client IP header when configured | Arbitrary forwarded IP headers | exact `TRUSTED_CLIENT_IP_HEADER`; malformed/multi-value headers rejected |
| AI/API providers | None in current runtime | Any browser invocation or secret | **NOT APPLICABLE**: no runtime AI provider call exists |
| Admin/reviewer user | Authorized content workflow only | Service-role authority or unvalidated payloads | fresh DB role checks, schemas, append-only review decisions, audit logs |

## Page and route inventory

Public pages: `/`, `/exam-format`, `/login`, `/register`, `/forgot-password`, `/reset-password`. `/pricing` is a temporary redirect to `/`. Public auth endpoints are `/auth/google` and `/auth/callback`.

Authenticated student pages: `/onboarding`, `/onboarding/diagnostic`, `/onboarding/diagnostic/summary`, `/dashboard`, `/practice`, `/practice/review/[sessionId]`, `/tests`, `/tests/[testId]`, `/tests/[testId]/take?attempt=`, `/progress`, `/results?attempt=`, `/mistakes`, `/bookmarks`, and `/profile`.

Privileged pages: `/admin`, `/admin/analytics`, `/admin/figure-preview`, `/admin/generate`, `/admin/questions/new`, `/admin/questions/[questionId]/edit`, `/admin/review`, `/admin/tests`, `/admin/tests/new`, and `/admin/tests/[testId]/edit`. Proxy checks are defense in depth; every privileged page/action also performs fresh server authorization.

Dynamic/query input is restricted as follows:

| Input | Validation / behavior |
|---|---|
| `[sessionId]`, `[testId]`, `[questionId]`, `attempt` | UUID schemas; ownership checked server-side |
| Practice query (`question`, `module`, `focus`, `focusName`, `difficulty`, `count`, `fromMock`) | normalized/validated by practice configuration and exact-review context loaders; no arbitrary redirect/fetch |
| Mistake filters | allowlisted filter parsing |
| Login `error`, `verification` | display-only allowlisted outcomes |
| Auth callback `code`, `token_hash`, `type`, `flow`, provider `error` | fixed flow/type parsers; tokens capped at 4096 characters; redirects are application-owned |
| Analytics export `format` | exact `jsonl`, otherwise CSV |
| `/pricing` | fixed temporary redirect to `/` |

## Server Action inventory

Legend: `G/U/I` means global/user/IP fixed-window buckets. All database-backed rate limits fail closed. “Service” means the Supabase service client is used only after fresh server authentication/authorization.

| Function | Auth / authorization | Rate limit | Validation and data | Privilege, CIA risk, cost |
|---|---|---|---|---|
| `loginAction` | Public | global 500/min; account 10/15m; IP 20/15m | bounded email/password schema; Supabase Auth | Auth session; C/I/A; SMTP none |
| `registerAction` | Public | global 100/min; account 10/h; IP 10/h | name/email/password/consent schema | Auth signup + verification email; C/I/A and email cost |
| `resendVerificationAction` | Public | global 100/min; account 10/h; IP 10/h | bounded email; enumeration-safe response | Auth email; C/A and email cost |
| `googleSignInAction` | Public | route applies global 300/min, IP 20/15m | provider feature flag | redirect only; C/A |
| `requestPhoneOtpAction` | Public, feature-gated | global 50/min; account 3/h; IP 5/h | normalized E.164-style number | Auth SMS; C/A and SMS cost |
| `verifyPhoneOtpAction` | Public, feature-gated | global 300/min; account 10/15m; IP 30/15m | phone/token schema | Auth session; C/I/A |
| `forgotPasswordAction` | Public | global 100/min; account 10/h; IP 10/h | bounded email; generic result | Auth email; C/A and email cost |
| `resetPasswordAction` | Recovery session required | Supabase provider/session controls | password/confirmation bounded schema | credential mutation; C/I |
| `logoutAction` | Session context | none (low-cost) | no caller identity | Auth sign-out; C |
| `saveThemePreferenceAction` | Fresh user if persisted | none (low-cost) | exact enum | Service updates only caller profile field; I |
| `saveMarketingPreferencesAction` | Fresh user | none (low-cost) | booleans derived from form presence | Service updates caller consent fields; I/privacy |
| `startPracticeAction` | User | G 120/min; U 20/h; IP 30/h | bounded practice config | Service/RPC + deterministic generation; I/A/CPU |
| `showPracticeQuestionAction` | User/owned session | none | UUID identity schema | Service-owned timing state; I |
| `submitPracticeAnswerAction` | User/owned active item | G 5000/min; U 600/h; IP 1200/h | exact answer union + snapshot match | service-only atomic grading RPC; I/A |
| `nextPracticeQuestionAction` | User/owned session | none | UUID schema | service-only state transition; I |
| `completePracticeAction` | User/owned session | none | UUID schema | service-only completion; I |
| `abandonPracticeAction` | User/owned session | none | UUID schema | service-only state transition; I |
| `openPracticeExplanationAction` | User/owned answered item | none | UUID schema | service-only event; private answer released only after answer; C/I |
| `reportPracticeQuestionAction` | User + encountered item | G 300/min; U 30/h; IP 60/h | reason enum, details <=2,000, provenance | service insert + DB trigger/dedup lock; I/A |
| `finishOnboardingAction` | User | none | exact two-value preference | service updates caller profile; I |
| `startDiagnosticAction` | User | G 60/min; U 3/day; IP 10/h | server-selected 15-question set | service-only atomic creation; I/A/CPU |
| `showDiagnosticQuestionAction` | User/owned diagnostic | none | UUID identity schema | timing only; I |
| `continueDiagnosticAction` | User/owned active item | G 5000/min; U 600/h; IP 1200/h | exact answer schema/snapshot | save then advance/complete; no early correctness; C/I/A |
| `generateCoreMockForCurrentUser` | User; feature flag | G 10/min; U 2/h; IP 4/h + cooldown/idempotency | request UUID schema | service reservation/persistence + local generators; I/A/CPU |
| `startTestAction` | User, published/entitled test | G 300/min; U 20/h; IP 50/h | test UUID | service snapshot; DB serializes one active curated attempt; I/A |
| `saveTestResponseAction` | User/owned active timed section | G 5000/min; U 600/h; IP 1200/h | bounded answer/time schema + exact snapshot match | service-only locked RPC; I/A |
| `submitTestAction` | User/owned attempt | same Mock-write G/U/IP | UUID/boolean schema; auto flag ignored for authority | atomic server grade/finalize RPC; I/A |
| `advanceTestSectionAction` | User/owned current section | same Mock-write G/U/IP | attempt/section UUIDs | server timer/state transition, then releases next section; C/I |
| `processTestClockAction` | User/owned attempt | same Mock-write G/U/IP | attempt UUID | server clock; fail-closed transition; C/I/A |
| `toggleBookmarkAction` | User | G 2000/min; U 300/h; IP 600/h | UUID + boolean | service mutates caller row only; I/A |
| `saveMistakeEntryAction` | User + owned source | same learning G/U/IP | UUID/source schema; bounded note | service mutation with ownership; C/I/A |
| `generateEquationPreviewAction` | Admin | role gate; no separate bucket | bounded seed/difficulty/quantity | local deterministic CPU + private bank history; C/I/A |
| `publishGeneratedEquationAction` | Admin | role gate | provenance/fingerprint schema; server reproduction | service publication/audit; I |
| `generateLatinPreviewAction` | Admin | role gate; no separate bucket | bounded seed/difficulty/quantity | local deterministic CPU; C/I/A |
| `publishGeneratedLatinAction` | Admin | role gate | provenance/fingerprint schema | service publication/audit; I |
| `generateFigurePreviewAction` | Admin | role gate; no separate bucket | bounded seed/difficulty/quantity | local deterministic CPU; C/I/A |
| `publishGeneratedFigureAction` | Admin | role gate | provenance/fingerprint schema | service publication/audit; I |
| `publishGeneratedQuestionsAction` | Admin | role gate | bounded batch + per-item schemas | server reproduction, bounded sequential batch, service writes; I/A |
| `createQuestionAction` | Admin | role gate | bounded FormData schema; structured JSON parsing | service create/version/update/audit; C/I |
| `reviewQuestionAction` | Reviewer/Admin | role gate | UUID + decision schema | service append-only decision/audit; I |
| `deleteQuestionAction` | Admin | role gate | UUID schema | soft delete + audit; I/A |
| `saveAdminTestAction` | Admin | role gate | bounded test/sections FormData schema | service transactional template writes; I/A |
| `adminTestLifecycleAction` | Admin | role gate | UUID + allowlisted lifecycle action | service publish/archive; I/A |

Admin generator actions do not invoke a billable external AI provider. Their remaining CPU-abuse risk requires an already-authorized Admin and is lower than the impact that account already possesses.

## Route handler inventory

| Route | Auth / authorization | Validation | Data/operation | CIA / cost |
|---|---|---|---|---|
| `GET /auth/google` | Public; provider flag | fixed callback and app-owned redirects; G 300/min + IP 20/15m | Supabase OAuth URL only | C/A; provider auth traffic |
| `GET /auth/callback` | Public one-time code/token | fixed flow/type; token length <=4096; no `next` redirect | exchanges/verifies Supabase token, then fixed post-auth route | C/I |
| `GET /api/progress` | Fresh user | no caller ID | owner-filtered service data; `private, no-store` | C/I/A |
| `GET /admin/analytics/export?format=` | Admin | `jsonl` allowlist, otherwise CSV | private response analytics; attachment/no-store | C/I/A |

No POST API routes, webhooks, uploads, file/storage endpoints, arbitrary outbound fetch endpoints, payment endpoints, or runtime AI endpoints exist.

## Browser Supabase surface

The browser client is used only for Supabase Auth state/session operations in the auth form and header. It does not issue `.from(...)` data queries. The proxy uses the anon/authenticated client for fresh `getUser()` and a narrow `user_roles(role)` query. All student data mutation and question delivery uses authenticated Server Actions and server-only data modules.

## Effective database surface

All 28 public tables have RLS enabled. Migration 022 revoked legacy blanket privileges and established deny-by-default future grants; migration 027 removes direct question-bank reads and browser mutation privileges. `anon` has no effective table data privileges after migration 027. “No browser grant” means RLS remains defense in depth but Postgres privilege checks deny direct PostgREST access first.

| Table | RLS policy model | Effective authenticated grant after 027 | Service use |
|---|---|---|---|
| `profiles` | owner/Admin SELECT; direct INSERT/UPDATE policies removed | SELECT | signup/profile/dashboard writes |
| `user_roles` | owner/Admin SELECT; Admin mutation policies | SELECT | role management/read |
| `questions` | published+approved or reviewer/Admin; Admin mutation | no browser grant | question delivery/admin |
| `question_options` | parent visibility; Admin mutation | no browser grant | question delivery/admin |
| `question_versions` | reviewer/Admin read; Admin insert | no browser grant | version workflow |
| `tests` | published or privileged; Admin mutation | no browser grant | catalog/admin |
| `test_sections` | visible parent or privileged; Admin mutation | no browser grant | Mock assembly/admin |
| `test_questions` | visible parent or privileged; Admin mutation | no browser grant | Mock assembly/admin |
| `test_attempts` | owner/Admin | safe summary columns SELECT only | create/state/grade/results |
| `user_responses` | nested attempt owner/Admin | no browser grant | answer/grade/results |
| `bookmarks` | owner/Admin | no browser grant | learning service |
| `question_reports` | reporter or reviewer/Admin SELECT; insert is trigger-constrained | SELECT only | reports/review |
| `user_topic_performance` | owner/Admin | no browser grant | analytics |
| `study_plans` | owner/Admin | no browser grant | planning |
| `study_tasks` | nested plan owner/Admin | no browser grant | planning |
| `question_reviews` | reviewer/Admin read; attributed append/Admin delete policies | SELECT only | review service |
| `subscriptions` | owner/Admin read; Admin mutation policies | SELECT only | future entitlement service |
| `audit_logs` | Admin SELECT/INSERT | no browser grant | admin audit trail |
| `mistake_notebook_entries` | owner/Admin | no browser grant | notebook service |
| `fidelity_audit_samples` | privileged audit policies | no browser grant | quality audit |
| `fidelity_audit_reviews` | privileged audit policies | no browser grant | quality audit |
| `practice_attempt_items` | Admin read policy | no browser grant | immutable curated Mock snapshots |
| `generated_core_mocks` | RLS enabled; browser fully revoked | no browser grant | generation reservation |
| `core_mock_generation_events` | RLS enabled; browser fully revoked | no browser grant | generation audit |
| `practice_sessions` | RLS enabled; browser fully revoked | no browser grant | Practice/Diagnostic state |
| `practice_session_items` | RLS enabled; browser fully revoked | no browser grant | immutable public/private snapshots |
| `practice_events` | RLS enabled; browser fully revoked | no browser grant | event audit |
| `security_rate_limits` | RLS enabled; no browser policies/grants | no browser grant | atomic limiter only |

## RPC and database-function surface

Only `current_user_has_role(app_role)` and `current_user_has_any_role(app_role[])` are executable by anon/authenticated because RLS policies depend on them. All other functions are service-role-only; default function EXECUTE is revoked from `public`, `anon`, and `authenticated`.

Service-only state RPCs: `create_core_mock_attempt`, `reserve_generated_core_mock`, `persist_generated_core_mock_attempt`, `fail_generated_core_mock`, `create_practice_session`, `record_practice_answer`, `advance_practice_question`, `open_practice_explanation`, `complete_practice_session`, `abandon_practice_session`, `create_initial_core_diagnostic`, `complete_initial_core_diagnostic`, `consume_security_rate_limit`, `consume_security_rate_limits`, `save_test_response_secure`, and `finalize_test_attempt_secure`.

Trigger/internal functions: `set_updated_at`, `handle_new_user`, `fill_attempt_item_keys`, `fill_response_question_key`, `enforce_question_report_invariants`, and `enforce_one_active_curated_mock`. Security-definer functions set `search_path = public`; RPC inputs are bound parameters, not dynamic SQL.

## Authentication, sessions, redirects, and cookies

- Email/password signup, login, resend, recovery, optional Google OAuth, and optional phone OTP are Supabase Auth operations.
- Email/phone input is bounded; passwords are 8–128 characters; callback tokens are capped; OTP schema is exact.
- Login does not distinguish unknown email from bad password. Password reset is generic. Resend now hides account-specific 4xx outcomes.
- Callback destinations are fixed routes; no caller-controlled `next` URL exists. Google redirects only to the Supabase-provided OAuth URL returned by the SDK.
- Server authorization uses `auth.getUser()`, not unverified client metadata. Roles come from `user_roles`.
- Production cookies are `Secure`, `SameSite=Lax`, path `/`. Supabase SSR requires browser-readable refresh cookies, so `HttpOnly` is intentionally not forced; CSP/XSS controls are compensating boundaries.
- Server Actions rely on Next.js same-origin Server Action protections; no permissive CORS headers exist.

## Headers, caching, rendering, and injection surface

- Production CSP uses a per-request nonce, `strict-dynamic`, no inline/eval scripts, exact Supabase connect origins, `object-src 'none'`, `frame-ancestors 'none'`, and HTTPS upgrade. Inline style remains allowed for current React style attributes.
- HSTS, `nosniff`, `DENY`, strict-origin referrer policy, and a restrictive camera/microphone/geolocation policy are configured.
- Private API/export responses are no-store. Authenticated pages are session-dependent server renders; no private data is intentionally placed in a shared cache.
- No `dangerouslySetInnerHTML`, `eval`, `new Function`, shell execution, arbitrary URL fetch, prototype-merging helper, raw SQL interpolation, or user-controlled HTML renderer was found.
- Framework buffering is capped at 1 MiB and Server Action bodies at 256 KiB; individual Zod schemas add field/collection limits.

## Secrets, providers, storage, and financial surface

Runtime environment names are `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, optional public auth feature flags, server-only `SUPABASE_SERVICE_ROLE_KEY`, optional `SECURITY_RATE_LIMIT_SECRET`, trusted-IP selection, free-launch flag, and bounded Mock-generation controls. Only the URL, anon key, and feature flags are public by design.

Tracked-file and Git-history scans found only `.env.example`; no private key, provider key, service JWT, or committed environment file was detected. `.env*` is ignored except `.env.example`. Build-output scanning is performed after the production build.

Current runtime providers are Supabase Database/Auth and, when explicitly enabled in hosted Auth, Google OAuth/phone delivery through Supabase. There is no payment, billing call, SMTP SDK, object storage use, upload, webhook, or AI API call. A user-configured Gemini key is not referenced by application/runtime code; it should not be copied to production unless a future reviewed feature needs it.

Potential billable/exhaustible operations are Auth email/SMS, Supabase DB/Auth traffic, Vercel requests/CPU, and deterministic local generation. Application rate limits cover public Auth, generation, grading, Mock writes, learning mutations, and reports. Provider-side budgets, spend caps, email/SMS quotas, WAF limits, and alerts remain dashboard controls and are **NOT VERIFIED**.

## State machines and replay boundaries

- Practice: `in_progress -> completed|abandoned`; one immutable item is current; answer is server graded; explanation opens only after answer; replay is idempotent/blocked by RPC state.
- Diagnostic: exactly 15 immutable items (5+5+5); server saves before advance; correctness/private snapshot is withheld until completion; completion RPC owns final status.
- Curated Mock: one active attempt per user/test is enforced under advisory lock; timed sections are server-derived; only the active section payload is released; response save locks the attempt; final grading verifies an exact response manifest and commits grades/status atomically.
- Generated Mock: request reservation/idempotency/cooldown precede generation; success/failure persistence is explicit; partial success is not returned as a completed attempt.
- Question workflow: draft/review/publish/delete transitions are role-gated; generated publication is reproduced and revalidated; reviews are attributed and append-only for reviewers; deletion is soft.
- Subscription infrastructure is retained for future use but free-launch entitlement is an explicit server configuration. Browser mutation privileges are absent.

## Explicitly absent surfaces

No payment checkout, price/plan mutation, external entitlement webhook, AI prompt, provider proxy, object-storage bucket use, file upload, user-provided URL fetch, GraphQL endpoint, custom CORS policy, background queue, cron handler, or account deletion workflow exists in the current application. Absence removes an immediate attack surface but account deletion/retention remains future privacy work.
