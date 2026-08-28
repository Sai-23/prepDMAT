# PrepDMAT Final Adversarial Security Audit 2.0

Audit date: 2026-08-29 (Asia/Kolkata)

Companion inventory: `reports/security/final-attack-surface.md`

## Executive verdict

No unresolved Critical or High repository finding remains. Seven meaningful issues were remediated in this gate: concurrent Mock state corruption, direct question-bank scraping, early future-section disclosure, incomplete structured-answer validation, missing mutation/grading rate limits, resend enumeration, and unbounded request/token fields.

The configured remote passed existing anonymous table and privileged-RPC denials. Its mistake-notebook columns show that migration 025's schema is present, but the two migration-026 atomic Mock RPCs are absent. Question, option, and test reads are denied; `test_sections` and `test_questions` are not privilege-blocked, so migration 027's complete grant state is not verified. The application revision must not be deployed before migrations 026–027 are applied and tested. Hosted Supabase/Vercel/Auth/SMTP/budget/backups controls and production TLS remain **NOT VERIFIED**.

## Findings

### FAS-001 — concurrent curated Mock creation and non-atomic final grading

- Severity: **MEDIUM**
- CIA: Integrity, Availability
- Attack surface: `startTestAction`, `saveTestResponseAction`, `submitTestAction`, `test_attempts`, `user_responses`
- Attack scenario: parallel starts create multiple active curated attempts; a save races a multi-statement submission so response payload, `is_correct`, score, and final status can disagree.
- Existing protection: authenticated actions, ownership filters, immutable snapshots, application resume precheck.
- Did it work? Partially. Ownership worked, but the precheck and multi-call grading were not a transaction/serialization boundary.
- Evidence: source review found check-then-create and per-response updates followed by attempt update.
- Remediation: migration 026 adds an advisory-lock trigger for one active curated attempt, a locked service-only response RPC, and a locked atomic finalize RPC that verifies exact response IDs and payloads before applying grades/status. A raced start resumes the winner.
- Test added: static RPC/grant/lock contract and pgTAP duplicate-start/direct-RPC denial assertions.
- Status: **FIXED IN REPOSITORY; DEPLOYMENT REQUIRED**.

### FAS-002 — complete published question bank was directly scrapeable

- Severity: **MEDIUM**
- CIA: Confidentiality, Availability
- Attack surface: Supabase PostgREST grants on `questions`, `question_options`, `tests`, `test_sections`, `test_questions`
- Attack scenario: anon/authenticated automation downloads all published question text, options, and test mappings without using product flows. Correct answers/private snapshots were not exposed, but the authored bank and Mock composition were bulk-copyable.
- Existing protection: RLS restricted rows to published/approved content and excluded answer columns.
- Did it work? It protected answers, not bulk content scraping.
- Evidence: migration 022 explicitly granted direct read columns/tables.
- Remediation: migration 027 revokes these direct reads. Authenticated server pages deliver only the required content through ownership-aware services. RLS remains defense in depth.
- Test added: static grant contract and pgTAP `has_*_privilege` denials.
- Status: **FIXED IN REPOSITORY; DEPLOYMENT REQUIRED**.

### FAS-003 — future timed Mock sections were present in the initial RSC/client payload

- Severity: **MEDIUM**
- CIA: Confidentiality, Integrity
- Attack surface: `/tests/[testId]/take?attempt=`, `getTestAttempt`, `TestRunner`
- Attack scenario: an authenticated candidate inspects page/RSC state to read later section questions before that section starts, gaining preparation time. Private snapshots/correct answers were not included.
- Existing protection: UI filtered questions by the active section and the server enforced section writes.
- Did it work? No; hiding in UI did not remove future public snapshots from the payload.
- Evidence: `getTestAttempt` loaded every `practice_attempt_item` before the fix.
- Remediation: the server now loads only `section_key = active.section.id`. A committed manual/clock transition returns only the newly unlocked section and its responses; the client merges it after success. Transition failure returns no payload.
- Test added: active-section query/transition static regression contract plus Mock renderer tests.
- Status: **FIXED**.

### FAS-004 — structured Mock answers were not matched exactly to the immutable public snapshot

- Severity: **MEDIUM**
- CIA: Integrity
- Attack surface: `saveTestResponseAction`, native Figure/Equation/Latin response payloads
- Attack scenario: forged candidate IDs, incomplete/extraneous symbol assignments, or a mismatched response kind reaches persistence. The deterministic grader still owned correctness, but malformed state could affect completion and reliability.
- Existing protection: Zod discriminated union and single-choice option membership.
- Did it work? Partially; structured response membership/exactness was incomplete.
- Evidence: Mock save checked only kind and single-choice option ID.
- Remediation: shared `answerMatchesQuestion` validates response kind, two-stage candidate membership, and exact unique equation-symbol assignments against the immutable public snapshot. Save clears any stale grade; finalization binds grades to unchanged payloads. Client `autoSubmitted` is ignored as authority.
- Test added: forged Figure candidate and extra equation-symbol rejection; shared validation contract.
- Status: **FIXED**.

### FAS-005 — authenticated grading/mutation endpoints lacked complete application throttling

- Severity: **MEDIUM**
- CIA: Availability; financial/resource abuse
- Attack surface: curated Mock start/write/submit/clock, Practice/Diagnostic grading, bookmark/notebook mutations, question reports
- Attack scenario: a valid account replays low-cost-looking actions at high frequency, consuming Vercel function executions, Supabase queries/RPCs, locks, and storage.
- Existing protection: Auth/generation limits, ownership/state constraints, provider limits.
- Did it work? Partially; expensive generation was covered but several write/grading entry points were not.
- Evidence: repository-wide action-to-policy map.
- Remediation: added fail-closed multi-dimensional policies:
  - assessment answer: global 5,000/min, user 600/h, IP 1,200/h;
  - Mock start: global 300/min, user 20/h, IP 50/h;
  - Mock write: global 5,000/min, user 600/h, IP 1,200/h;
  - learning mutation: global 2,000/min, user 300/h, IP 600/h;
  - report: global 300/min, user 30/h, IP 60/h.
- Test added: action coverage and policy/static limiter contracts.
- Status: **FIXED**.

### FAS-006 — resend-verification response could enumerate pending accounts

- Severity: **LOW**
- CIA: Confidentiality
- Attack surface: `resendVerificationAction`
- Attack scenario: compare success with account-specific Supabase 4xx responses to determine whether an address has a pending signup.
- Existing protection: email/account/IP/global rate limits.
- Did it work? Rate limited discovery but did not make outcomes indistinguishable.
- Evidence: provider errors were returned through a different public branch.
- Remediation: account-specific 4xx outcomes now return the same generic success message; rate-limit and provider-unavailable outcomes remain safely distinct.
- Test added: unknown-account/provider `user_not_found` regression.
- Status: **FIXED**.

### FAS-007 — callback/auth and framework request bounds were incomplete

- Severity: **LOW**
- CIA: Availability
- Attack surface: Server Action bodies, proxy buffering, callback query tokens, auth credential fields
- Attack scenario: oversized bodies/tokens cause avoidable parsing/buffering or provider work.
- Existing protection: many field-level schemas and platform limits.
- Did it work? Partially; no explicit application-wide action/proxy caps and some auth fields had no maximum.
- Evidence: Next config and auth schemas before remediation.
- Remediation: 1 MiB proxy buffer limit, 256 KiB Server Action limit, email max 254, password max 128, callback code/token max 4,096.
- Test added: config/schema/callback contracts.
- Status: **FIXED**.

### FAS-008 — hosted controls and current remote migration state cannot be proven from source

- Severity: **INFORMATIONAL** (becomes launch-blocking if required settings fail)
- CIA: Confidentiality, Integrity, Availability
- Attack surface: Supabase/Vercel/Auth/SMTP/DNS/GitHub dashboards and deployed database
- Attack scenario: missing spend caps, weak Auth settings, absent backups, wrong redirect domains, or deploying app before RPC migrations undermines repository controls.
- Existing protection: repository configuration, CI, live read-only probe.
- Did it work? Existing remote denials worked; new RPCs returned `PGRST202`, proving migration 026 is absent. Question/options/tests returned 42501, while `test_sections`/`test_questions` were queryable under current grants (no content was printed). Production TLS was not addressable because the configured app URL is localhost.
- Evidence: live audit at `2026-08-28T20:37:26.985Z`; browser list empty; local header probe only.
- Remediation: exact dashboard/deployment checklist below. Confirm migration 025 is recorded, apply migrations 026 and 027 before this app build, refresh PostgREST schema, then run pgTAP and the live probe.
- Test added: live script now checks mistake-notebook restrictions and the two new RPC contracts.
- Status: **NOT VERIFIED / MANUAL ACTION REQUIRED**.

## Critical and High findings

| Severity | Open | Fixed in this gate | Result |
|---|---:|---:|---|
| Critical | 0 | 0 | none found |
| High | 0 | 0 | prior High controls were re-verified in source/tests |
| Medium | 0 in repository; 2 migrations pending remote deployment | 5 | no unresolved code finding |
| Low | 0 | 2 | fixed |

The configured remote still exhibits the pre-026 state for FAS-001 and does not show the complete 027 privilege state for FAS-002. Deployment order is therefore mandatory even though these findings are not classified High.

## Prior remediation / video recommendation matrix

| Video recommendation | Already implemented? | Verified? | Evidence | Additional work |
|---|---|---|---|---|
| RLS ownership | Yes | PASS in migration/static tests; partial live PASS | all 28 tables RLS; sensitive anon probes deny access | confirm 025; deploy 026–027; execute pgTAP |
| Security-sensitive writable columns | Yes | PASS | browser grants revoked; profile workflow fields service-owned | staging pgTAP |
| Backend rate limiting | Yes | PASS | DB fixed windows + atomic batch RPC; fail-closed tests | hosted load/alert tuning |
| Per-user limits | Yes | PASS | account/user HMAC buckets | monitor false positives |
| Per-IP limits | Yes | PASS in code | strict single trusted-header parser | verify exact Vercel header in production |
| Frontend secret isolation | Yes | PASS | only anon key/URL public; tracked/history scans clean | remove unused local/provider envs |
| Server-side API/provider calls | Yes | PASS / N/A | service role only in server modules; no runtime AI/payment API | none for current runtime |
| RLS + GRANT review | Yes | PASS in repository | migration 022 deny-by-default; 027 closes scraping | deploy and pgTAP |
| IDOR/nested ownership | Yes | PASS | owner IDs derived from session; nested RPC queries; adversarial tests | live USER A/B browser run |
| Immutable private answer snapshots | Yes | PASS | service-only item tables; no direct grants | deploy Mock RPC migration |
| Budget caps | External control | NOT VERIFIED | cannot be inferred from source | configure Supabase/Vercel/provider caps |
| Spend alerts | External control | NOT VERIFIED | cannot be inferred from source | configure alerts and recipients |
| Direct Supabase configuration verification | Partially | NOT VERIFIED | read-only schema probe only | Auth, backup, network, storage dashboard review |
| CSP/XSS/clickjacking | Yes | PASS in production config | nonce/strict-dynamic; no unsafe HTML; frame denial | verify deployed response in production |
| Dependency/supply chain | Yes | PASS | npm audit clean; CI + Dependabot | enable branch protection and secret scanning |

## CIA summary

### Confidentiality

Potential leaks reviewed: cross-user profiles/attempts/results, private answer snapshots/explanations, question bank, future timed questions, Admin analytics, auth-account existence, tokens/secrets, logs, caches, and provider credentials. Ownership/RLS tests, grant review, safe snapshots, no-store responses, CSP, generic auth messages, and tracked/history scans passed. Repository direct-bank reads and future sections were closed. Remaining uncertainty is hosted configuration, production RSC/network inspection, dashboard logs, storage bucket state, and applying/verifying migration 027 remotely.

### Integrity

Potential modification reviewed: role/subscription/profile mass assignment, forged ownership IDs, forged answers/scores/timers/completion flags, replay, concurrent start/save/submit, review attribution, publishing, report provenance, bookmarks/mistakes, and Admin lifecycle changes. Fresh auth/roles, schemas, service-only RPCs, immutable snapshots, DB ownership checks, exact grading, state machines, locks, append-only reviews, soft delete, and audit logs protect these paths. Atomic Mock RPC deployment and live pgTAP remain required.

### Availability

Potential abuse reviewed: signup/login/email/SMS floods, deterministic generation CPU, repeated grading/writes/reports, DB lock/race exhaustion, oversized payloads, dependency vulnerabilities, and bill shock. Multi-dimensional DB limits, generator cooldown/idempotency, bounded batches/inputs, request caps, atomic state, and zero known npm vulnerabilities reduce repository risk. Provider spend caps, quotas, WAF/concurrency, alerting, SMTP limits, and backup restore remain external and not verified.

## Adversarial actor/resource matrix

| Resource/action | ANON | USER A own | USER A -> USER B | ADMIN privileged path |
|---|---|---|---|---|
| profile/role | denied | narrow read; service-owned update | denied | fresh role + service action |
| attempt/response/private snapshot | denied | action-mediated owner access | denied | privileged server data only |
| Practice/Diagnostic/Mock create | denied | allowed within limit/state | caller cannot select owner | operational/admin read only |
| answer/grade/score | denied | answer only; server grades | denied | no client score override |
| bookmark/mistake | denied | action-mediated | source ownership denied | server operations |
| report | denied | encountered item only | provenance trigger denies | reviewer/admin review path |
| question/review | no direct bank read | no direct bank read/mutation | same | reviewer/Admin action by role |
| subscription/entitlement | denied | read own only | denied | service action only; browser DML revoked |
| rate-limit table/RPC | denied | denied | denied | service-only backend |
| analytics export | denied | denied | denied | Admin route + no-store |

The pgTAP file has 47 assertions covering anonymous denial, USER A/USER B IDOR, reviewer attribution/history, Admin browser-DML denial, subscription/profile mass assignment, report provenance/deduplication, function EXECUTE denial, and duplicate curated Mock creation.

## RLS and database verdict

Repository verdict: **PASS, pending migration deployment and executable pgTAP**.

- 28/28 public tables explicitly enable RLS.
- Legacy blanket grants are revoked and future default privileges deny anon/authenticated tables, sequences, and functions.
- Only role-helper functions are browser executable; privileged RPCs are service-only.
- Browser cannot directly read response/private snapshot/rate-limit/session tables.
- Migration 027 also removes browser question-bank reads and review/subscription DML.
- Service usage is preceded by fresh auth and derives user ID from the session.
- Live read-only probes confirmed existing anon denials and existing RPC denial behavior, but new Mock RPCs are absent remotely.

Local pgTAP execution is **NOT RUN** because Docker Desktop's daemon was unavailable and neither Supabase CLI nor `psql` was installed. Static SQL contracts passed. Executable staging pgTAP is mandatory after migrations.

## Auth/session verdict

Repository verdict: **PASS; hosted settings NOT VERIFIED**.

Auth flows use bounded schemas, generic login/reset/resend messages, application rate limits, provider feature flags, one-time Supabase exchanges, fixed redirects, fresh `getUser()`, DB roles, and secure production cookie options. Cross-device verification deliberately requires the destination device to create its own session rather than transferring a session from another browser. There is no custom auth token protocol. Hosted email confirmation, CAPTCHA, leaked-password protection, MFA policy, redirect allowlist, and session duration require dashboard verification.

## Rate-limit and cost-abuse verdict

Repository verdict: **PASS** for application enforcement. The database batch limiter is shared, fixed-window, atomic, HMAC-pseudonymous, and fail-closed. Public Auth, provider-message routes, generation, grading, Mock state, learning mutations, and reports have global plus account/user/IP dimensions as applicable. IP limiting is intentionally omitted if the configured trusted header is `none`; exact production proxy configuration must be verified. Provider budgets and spend alerts are **NOT VERIFIED**.

## Secret and provider isolation verdict

Tracked repository/history scan: **PASS**. Build-output scan is recorded in verification after build. The service role and rate-limit secret are server-only. No runtime Gemini/OpenAI/NVIDIA/OpenRouter/payment/SMTP/storage SDK exists. The user-reported Gemini key is unused by runtime code and should remain out of deployment or be removed/rotated if unnecessary. Supabase anon key exposure is expected and is not authorization.

## Mock answer-security verdict

Repository verdict: **PASS after migration 026**. Public/private snapshots are separated; private answers are never in initial/active RSC payloads; future timed public questions are withheld; active section and expiry are server-derived; structured answers must match the immutable public snapshot; score and auto-submit authority are server-side; save/finalize are serialized and atomic. Remote deployment is currently missing these RPCs.

## Admin authorization verdict

Repository verdict: **PASS**. Proxy gates are backed by fresh page/action role checks. Review/Admin capabilities are separated. Generated publication reproduces and validates provenance. Review attribution is bound to the authenticated actor and reviewer decisions are append-only. Lifecycle mutations use service-only modules and audit writes. Direct authenticated review/subscription DML is revoked.

## Manual dashboard and deployment checklist

Do not convert a row to PASS without observing it in the named provider.

### Supabase — NOT VERIFIED

1. Database > Migrations: confirm `202608280025_mistake_notebook_sources.sql` is recorded (its columns are live), then apply `202608280026_mock_state_security.sql` and `202608280027_close_question_bank_scraping.sql` before deploying this app revision.
2. Refresh the PostgREST schema cache; rerun `node scripts/run-phase12-live-schema-audit.mjs`. Both new RPCs must report `exists: true`, safe validation reached, and anon 42501.
3. Run `supabase/tests/rls_security_remediation.test.sql` against staging; require all 47 assertions and rollback.
4. Authentication > URL Configuration: production Site URL must be HTTPS; redirect allowlist must contain only exact production/approved preview callback URLs, not broad wildcards.
5. Authentication > Providers: enable only used providers; verify email confirmation, secure email change, OTP expiry, provider rate limits, CAPTCHA/bot protection, leaked-password protection, and MFA policy.
6. Authentication > Email/SMS: verify sender/domain, quotas, bounce/complaint monitoring, OTP templates, and no secret/token logging.
7. Database > Settings: require SSL; inspect exposed schemas, connection limits/pooling, statement timeout, network restrictions, and extensions.
8. Database > Backups: enable scheduled backups/PITR appropriate to plan; perform and document a restore drill with RPO/RTO.
9. Storage: verify there are no unexpected public buckets/policies. Current app storage use is NOT APPLICABLE.
10. Billing/Usage: set spend cap or maximum budget, DB/Auth/egress thresholds, and alerts to at least two owners.

### Vercel — NOT VERIFIED

1. Set the production domain to HTTPS and make `NEXT_PUBLIC_APP_URL` that exact origin.
2. Scope service-role/rate-limit secrets to required environments only; ensure preview builds do not inherit production secrets without intent.
3. Confirm log drains/redaction never record cookies, auth codes, tokens, answers, service keys, or raw provider payloads.
4. Configure WAF/bot protection and request/concurrency controls for Auth and Server Action traffic.
5. Configure monthly budget/spend alerts and function/egress alerts with escalation owners.
6. Fetch public and authenticated routes in production; verify CSP without dev `unsafe-eval`, HSTS over HTTPS, no-store private payloads, no cross-user RSC data, and no cached redirects/session pages.

### SMTP/SMS provider — NOT VERIFIED

1. Confirm Supabase's configured sender is an authenticated domain (SPF, DKIM, DMARC) with production From/Reply-To values.
2. Set per-hour/day quotas, anomaly/spend alerts, bounce/complaint suppression, and provider-side abuse limits.
3. Test signup, resend, reset, expiry, and unknown-address behavior without exposing account existence.
4. If phone auth remains disabled, confirm no active SMS provider can incur charges. If enabled, set strict regional/quota/spend controls.

### AI/API providers — NOT APPLICABLE to current runtime / NOT VERIFIED for account billing

1. No runtime AI call exists; do not deploy Gemini/OpenAI/NVIDIA/OpenRouter keys.
2. Remove or rotate unused local/provider keys where practical.
3. If AI is introduced later, require server-only calls, model allowlists, timeouts, output validation, per-user/global budgets, provider hard caps, and spend alerts before launch.

### GitHub — NOT VERIFIED

1. Protect `main`: pull request, required security workflow, no force push/deletion, resolved reviews, and least-privilege maintainers.
2. Enable secret scanning/push protection and Dependabot security updates/alerts.
3. Review Actions permissions and allowed actions. Current workflow uses read-only contents and no repository secrets, but action tags should be evaluated for SHA pinning policy.
4. Confirm environment approvals for production deployment and rotate any secret exposed outside approved stores.

## Migration/deployment gate

Required order:

1. Back up/confirm rollback plan.
2. Confirm migration 025's ledger state, then apply migrations 026 and 027 in order.
3. Refresh schema cache.
4. Run all 47 pgTAP assertions.
5. Run the read-only live audit; require both new RPCs to exist and anon denial.
6. Deploy the application revision.
7. Run authenticated USER A/USER B/Admin smoke tests and inspect RSC/network/cache behavior.

Deploying the application before migration 026 will make curated Mock response save/finalization fail closed because the required RPCs do not exist.

## Verification record

| Check | Result |
|---|---|
| Lint | PASS |
| TypeScript | PASS |
| Security/Auth suites | PASS — 83 tests |
| Practice suites | PASS — 166 tests; 1 opt-in stress audit skipped |
| Diagnostic suites | PASS — 11 tests |
| Mock suites | PASS — 53 tests; 2 opt-in stress audits skipped |
| Admin suites | PASS — 74 tests |
| RLS/pgTAP | NOT RUN locally — Docker daemon/CLI unavailable; 47 assertions authored |
| Read-only remote schema/RPC probe | PARTIAL PASS — 025 columns present; core denials pass; 026 RPCs absent; 027 grants incomplete/unverified |
| `npm audit --audit-level=low` | PASS — 0 vulnerabilities |
| Full `npm test` | PASS — 122 files / 682 tests; 17 opt-in audit files / 27 tests skipped by normal flags |
| Production build | PASS — Next.js 16.3.3, TypeScript, and 32-page generation |
| Build secret scan | PASS — 6,474 files; 0 generic matches; 0 exact private env value matches |
| `git diff --check` | PASS |
| Production browser/TLS/cache test | NOT VERIFIED — configured URL is localhost and browser unavailable |

## Final verdict

# READY AFTER MANUAL PROVIDER CHECKS

This verdict is conditional on confirming migration 025, applying migrations 026–027 before the app deployment, passing all 47 staging pgTAP assertions, verifying the two new RPCs and all five question-bank denials live, and completing the Supabase/Vercel/Auth/budget/backup checks above. No Critical or launch-blocking High code finding remains.
