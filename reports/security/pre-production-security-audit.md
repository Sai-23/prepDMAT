# PrepDMAT Pre-Production Security Audit

Audit date: 2026-08-27  
Scope: current local repository and locally available Git history  
Mode: report only; no application code, migrations, packages, environment variables, or Supabase settings were changed

## Executive Summary

**Overall risk: HIGH**

The core authentication, Admin authorization, ID ownership, immutable mock snapshots, and answer-key separation are generally well designed. Admin pages and mutations perform fresh server-side role checks, student mutations authenticate and validate input at runtime, private grading snapshots are not returned during active mocks, and later migrations revoke direct browser access to attempt and response storage.

Public deployment is nevertheless blocked by repository-specific authorization gaps in the database-facing API surface. Most importantly, an authenticated student can write their own `subscriptions` rows and thereby satisfy the application's premium entitlement check. Broad direct-write policies also let students mutate protected onboarding/profile workflow fields, let authenticated users bypass the report action's size/source controls, and let reviewers alter or delete other reviewers' review records. Production Auth, CAPTCHA/rate-limit, email confirmation, redirect allowlist, and HTTPS settings cannot be proven from the repository and must be verified before launch.

Counts below include actionable and manual-verification findings, not the SAFE/NOT APPLICABLE checklist entries:

| Severity | Count |
| --- | ---: |
| Critical | 0 |
| High | 1 |
| Medium | 7 |
| Low | 3 |
| Info | 2 |

## Architecture Summary

- **Framework:** Next.js 16.3.0 App Router with React 19.2.8; no explicit Edge runtime declarations were found. Package evidence: `package.json:38-46`.
- **Supabase SDKs:** `@supabase/ssr` 0.5.2 and `@supabase/supabase-js` 2.49.1.
- **Supabase clients:**
  - Browser client factory uses only the public URL and anon key: `src/lib/supabase/client.ts:1-21`. No production call sites outside that factory were found.
  - Per-request server client uses the anon key and Supabase SSR cookies: `src/lib/supabase/server.ts:15-38`.
  - Proxy client refreshes/propagates the SSR session: `src/lib/supabase/proxy.ts:12-40`.
  - A server-only service-role client is used by Admin and most student data services: `src/lib/supabase/admin.ts:1-25`.
- **Authentication:** Supabase email/password, password recovery, optional Google OAuth, and optional phone OTP. Auth actions use Zod/explicit validation and generic auth errors. The OAuth callback exchanges a PKCE code and redirects only to fixed application paths.
- **Admin model:** roles are stored in `public.user_roles`; fresh role rows are queried in the proxy, page guards, route handlers, and every Admin Server Action. Admin status is not taken from mutable client state or profile metadata.
- **Request boundary:** `src/proxy.ts` protects student and Admin pages, but intentionally excludes `/api`; each existing API route performs its own server guard. Server Actions also guard themselves.
- **Server Actions:** six action modules and 46 exported actions: Auth (11), Admin (13), Practice (8), Mock/Test (6), Onboarding (6), Learning (2).
- **Route handlers:** four GET handlers: Supabase callback, Google OAuth start, private progress JSON, and Admin analytics export.
- **Database layer:** server-only domain services plus 21 ordered SQL migrations. User-specific server queries consistently bind the authenticated `user.id` before loading or mutating data.
- **RLS/grants:** RLS is enabled on all application tables. Sensitive practice/mock tables are additionally revoked from `anon` and `authenticated`; several older tables retain broad authenticated grants controlled only by RLS.
- **Snapshots/grading:** active Practice/Mock payloads return `public_snapshot`; answer keys, explanations, and traces remain in `private_snapshot` until answer checking or completion. Scores are computed server-side.
- **External integrations:** Supabase Auth/Database; Google and phone providers are mediated by Supabase. No runtime OpenAI, Gemini, NVIDIA, OpenRouter, SMTP, payment, webhook, or upload integration was found.
- **Storage:** local Supabase storage is enabled in `supabase/config.toml`, but application upload/storage code and storage policies are absent.
- **Logging/errors:** generic global error UI; generation failures log pseudonymous user and mock IDs. Several actions forward downstream `Error.message` values.
- **Deployment/security headers:** `poweredByHeader` disabled; HSTS, nosniff, DENY framing, Referrer-Policy, and Permissions-Policy are configured. CSP is absent.
- **Supply chain:** npm lockfile v3 with integrity hashes. Only expected install-script packages were found (`esbuild`, platform-optional `fsevents`, and `unrs-resolver`). No `.github` workflows or Dependabot configuration exist.

## Immediate Deployment Blockers

1. **SEC-001:** authenticated users can self-create/modify active subscriptions and unlock any published premium tests.
2. **SEC-002/SEC-003/SEC-004:** broad RLS write policies bypass the server action allowlists for profile workflow state, question reports, and review-record integrity.
3. **SEC-005/SEC-008:** production Supabase Auth throttling, CAPTCHA, email confirmation, redirect allowlist, leaked-password protection, and HTTPS behavior must be verified before public registration is enabled.
4. **SEC-006, conditional:** if on-demand Core mocks are enabled in production, the existing per-account cooldown is insufficient against multi-account/IP-distributed compute abuse.

## Detailed Findings

### SEC-001

- **Category:** RLS / entitlement escalation
- **Severity:** HIGH
- **Status:** VULNERABLE
- **Affected file(s):** `supabase/migrations/202608040004_learning_schema.sql:80-91`; `supabase/migrations/202608040005_rls_policies.sql:22-23,386-391`; `src/lib/tests/data.ts:99-111,136-142`
- **Evidence:** authenticated users receive table privileges, and `subscriptions_access` is a `FOR ALL` policy allowing a user to write any row whose `user_id` is their own. `hasPremiumAccess()` trusts any `trialing` or `active` row that has not ended.
- **Attack scenario:** a signed-in student calls Supabase PostgREST directly with the public anon key and their valid session JWT, inserts a subscription for their own user ID with `status='active'`, then starts a published premium test through the normal Server Action.
- **Impact:** unauthorized entitlement escalation; access to premium tests without a trusted billing/Admin event; corruption of provider/customer/subscription identifiers.
- **Recommended fix:** replace the `FOR ALL` policy with owner-only SELECT; revoke INSERT/UPDATE/DELETE from `authenticated`; allow mutation only through a narrowly authorized service/Admin or verified billing webhook path. Add appropriate uniqueness/provider constraints and test direct REST denial.
- **Confidence:** HIGH

### SEC-002

- **Category:** Mass assignment / profile workflow integrity
- **Severity:** MEDIUM
- **Status:** VULNERABLE
- **Affected file(s):** `supabase/migrations/202608040002_question_schema.sql:1-9`; `supabase/migrations/202608220019_initial_core_diagnostic.sql:3-15`; `supabase/migrations/202608250020_auth_consent.sql:2-17`; `supabase/migrations/202608040005_rls_policies.sql:22-23,57-62`
- **Evidence:** the application actions update explicit profile field allowlists, but the database grants authenticated table writes and the owner UPDATE policy does not restrict columns. A student can directly modify `onboarding_completed_at`, `onboarding_preference`, `diagnostic_status`, `diagnostic_session_id`, consent timestamps/version, display names, timezone, and other own-profile fields.
- **Attack scenario:** a student bypasses the onboarding actions and sends a direct PostgREST PATCH setting diagnostic state to `completed` or forges consent metadata. RLS accepts the row because `auth.uid() = id` remains true.
- **Impact:** onboarding/diagnostic workflow bypass, unreliable consent audit data, and loss of server-side field allowlist guarantees. This does **not** permit Admin-role escalation because roles live in the separately protected `user_roles` table.
- **Recommended fix:** revoke broad profile UPDATE, grant only safe columns if column grants are used, or expose a narrow RPC/Server Action path for each allowed mutation. Keep workflow-owned diagnostic fields service-only and add direct REST regression tests.
- **Confidence:** HIGH

### SEC-003

- **Category:** Input validation / abuse / database denial of service
- **Severity:** MEDIUM
- **Status:** VULNERABLE
- **Affected file(s):** `supabase/migrations/202608040004_learning_schema.sql:10-20`; `supabase/migrations/202608040005_rls_policies.sql:22-23`; `supabase/migrations/202608220018_practice_sessions.sql:125-137`; `src/lib/practice/schemas.ts:51-55`; `src/app/practice/actions.ts:107-115`
- **Evidence:** the Server Action caps report details at 2,000 characters and proves the item belongs to the user's session, but authenticated users retain direct INSERT privileges. The effective insert policy accepts any own `reporter_id`; when `question_id` is non-null it does not require session membership. The database `details` column has no length constraint and no report rate/uniqueness control.
- **Attack scenario:** a free authenticated account repeatedly inserts reports for known question IDs with very large `details` values directly through PostgREST, bypassing Zod and the action's session linkage.
- **Impact:** report-queue pollution, untrusted provenance, database/storage growth, reviewer workload amplification, and possible availability impact.
- **Recommended fix:** revoke direct INSERT from `authenticated` and write through an ownership-checked server path, or mirror all action invariants in RLS/constraints. Add a database length check, per-user/question deduplication or bounded frequency, and application/IP throttling.
- **Confidence:** HIGH

### SEC-004

- **Category:** Reviewer authorization / audit integrity
- **Severity:** MEDIUM
- **Status:** VULNERABLE
- **Affected file(s):** `supabase/migrations/202608040004_learning_schema.sql:70-78`; `supabase/migrations/202608040005_rls_policies.sql:22-23,373-384`; `src/app/admin/actions.ts:523-539`
- **Evidence:** the Server Action records the fresh authenticated reviewer ID, but the `question_reviews_modify` `FOR ALL` policy permits any reviewer or Admin to insert, update, or delete any review row. It does not bind `reviewer_id` to `auth.uid()`.
- **Attack scenario:** a reviewer bypasses the action and directly edits/deletes another review or inserts a decision attributed to another known reviewer UUID.
- **Impact:** corrupted review attribution and history, weakened non-repudiation, and unreliable content-governance evidence. It does not grant Admin mutation rights on `questions`.
- **Recommended fix:** split policies by operation; require `reviewer_id = auth.uid()` on INSERT; make reviews immutable or allow only the owning reviewer/Admin to update; permit delete only to Admin or not at all. Prefer append-only review history.
- **Confidence:** HIGH

### SEC-005

- **Category:** Authentication rate limiting
- **Severity:** MEDIUM
- **Status:** POTENTIALLY VULNERABLE
- **Affected file(s):** `src/app/auth/actions.ts:51-294`; `src/components/auth/auth-form.tsx`; `supabase/config.toml:17-23`; `docs/AUTH-DEPLOYMENT.md:23-49`
- **Evidence:** login, registration, resend verification, phone OTP request/verification, and password-reset actions have no application/IP limiter or CAPTCHA. Provider 429 errors are handled safely, but effective hosted Supabase Auth limits and CAPTCHA settings are external. The UI's 60-second OTP retry state is not a server security boundary.
- **Attack scenario:** automated clients invoke Server Actions directly, ignoring disabled buttons, to attempt credentials or drive email/SMS/reset traffic until Supabase/provider limits intervene.
- **Impact:** account attack traffic, email/SMS cost and nuisance, availability degradation, and possible provider suspension. Actual exposure depends on production Supabase controls.
- **Recommended fix:** verify and document hosted Auth rate limits; enable CAPTCHA/bot protection for signup, password recovery, and OTP; add application-level account/IP throttling with proxy-aware client IP handling; monitor 429 and provider-cost events.
- **Confidence:** HIGH for missing application controls; production exploitability requires manual verification

### SEC-006

- **Category:** Expensive generation / denial of service
- **Severity:** MEDIUM
- **Status:** POTENTIALLY VULNERABLE
- **Affected file(s):** `src/app/tests/actions.ts:21-34`; `src/lib/mocks/on-demand.ts:349-445`; `src/lib/validators/env-schema.ts:16-26`; `supabase/migrations/202608220017_on_demand_core_mocks.sql:182-275`; `src/app/practice/actions.ts:26-35`
- **Evidence:** on-demand mocks have idempotency, one in-progress job per user, and a database-enforced 0-300 second cooldown (default 30), while Practice allows one active session. There is no global, IP, device, or cross-account quota. Public registration makes per-account controls bypassable with multiple accounts. The mock feature defaults disabled, so production enablement is configuration-dependent.
- **Attack scenario:** an attacker automates many accounts and concurrently requests deterministic mock/practice generation, exhausting application CPU even though each account obeys its own cooldown.
- **Impact:** elevated CPU/memory use, slow Server Actions, request timeouts, and degraded availability for legitimate students.
- **Recommended fix:** keep the feature disabled until a shared rate limiter and concurrency budget exist; apply account plus IP/device quotas, a global semaphore/queue, timeouts, metrics, and abuse alerts. Preserve the existing idempotency and database cooldown.
- **Confidence:** HIGH for control scope; production exposure depends on the feature flag

### SEC-007

- **Category:** Session cookie and Content Security Policy hardening
- **Severity:** MEDIUM
- **Status:** POTENTIALLY VULNERABLE
- **Affected file(s):** `src/lib/supabase/server.ts:15-38`; `src/lib/supabase/proxy.ts:12-40`; `next.config.ts:16-34`; installed `node_modules/@supabase/ssr/src/utils/constants.ts:3-9`
- **Evidence:** the application does not override Supabase SSR cookie defaults: `SameSite=Lax`, `Path=/`, `HttpOnly=false`, and no explicit `Secure`. HSTS is configured, but CSP is absent. No current raw-HTML/XSS sink was found, which lowers immediate likelihood.
- **Attack scenario:** a future XSS can read the Supabase auth cookie; or, if the production host accepts plaintext HTTP before HSTS is established, a cookie without `Secure` can be exposed on a downgraded first request.
- **Impact:** session theft/account takeover if an XSS or network downgrade prerequisite is achieved.
- **Recommended fix:** verify live cookie flags; set `Secure` in production; enforce platform-level HTTPS redirects; assess whether this server-action-heavy architecture can use HttpOnly session storage without breaking Supabase refresh. Add a tested CSP, ideally nonce-based, and include the exact Supabase/connect origins required.
- **Confidence:** HIGH for repository/default configuration; MEDIUM for production exploitability

### SEC-008

- **Category:** Production Auth/domain configuration
- **Severity:** MEDIUM
- **Status:** NEEDS MANUAL VERIFICATION
- **Affected file(s):** `supabase/config.toml:17-23`; `src/app/auth/actions.ts:73-119`; `src/lib/auth/config.ts:18-25`; `docs/AUTH-DEPLOYMENT.md:13-49`
- **Evidence:** local configuration uses localhost URLs. Hosted-project email confirmation, leaked-password protection, password policy, CAPTCHA, MFA, redirect allowlist, SMTP, identity linking, network restrictions, and production Site URL are not represented in repository state. The application permits an immediate session when Supabase returns one at signup, so email confirmation enforcement depends on the hosted setting.
- **Attack scenario:** a production project launched with email confirmation off or overly broad redirect URLs admits unverified email accounts or sends Auth links to unintended origins.
- **Impact:** weaker account assurance, bot account creation, redirect/callback risk, and unreliable recovery/verification delivery.
- **Recommended fix:** complete every item in “Manual Supabase Dashboard Checks” before enabling public traffic and record screenshots/exports in the release evidence.
- **Confidence:** HIGH that repository evidence is insufficient

### SEC-009

- **Category:** Error information exposure
- **Severity:** LOW
- **Status:** POTENTIALLY VULNERABLE
- **Affected file(s):** `src/app/practice/actions.ts:22-23`; `src/app/onboarding/actions.ts:18-19`; `src/app/tests/actions.ts:45-48,60-64,80-84,102-118`; `src/app/learning/actions.ts:26-30,53-57`; `src/app/admin/actions.ts:135-140,186-191,229-230,514-518,533-536,556-560,582-586,656-660,681-685`
- **Evidence:** many actions return any caught `Error.message` directly to the client. Current data services usually replace Supabase errors with deliberate safe messages, and Admin-only generator diagnostics are less exposed, but the boundary does not enforce an allowlist.
- **Attack scenario:** a future or unwrapped downstream database/provider error reaches one of these catch blocks and exposes constraint names, internal states, or provider details to the caller.
- **Impact:** low-grade information disclosure that can improve attacker reconnaissance.
- **Recommended fix:** return typed safe error codes/messages at the action boundary and log sanitized internal details server-side. Preserve only explicitly declared user-safe domain errors.
- **Confidence:** MEDIUM

### SEC-010

- **Category:** Dependency vulnerabilities
- **Severity:** LOW
- **Status:** POTENTIALLY VULNERABLE
- **Affected file(s):** `package.json:38-43`; `package-lock.json:2439-2446,2512-2522,7209-7220`
- **Evidence:** read-only `npm audit` reported 0 critical, 1 high, and 2 low advisories: transitive `nanoid@3.3.17` (GHSA-2v37-7h3g-55p8, upstream HIGH), transitive `@supabase/auth-js@2.68.0` (GHSA-8r88-6cj9-9fh5, LOW), and direct `@supabase/supabase-js@2.49.1` via that Auth advisory (LOW). `nanoid` is reached through PostCSS/Next build tooling; no application code calls custom nanoid generators, so the reported infinite-loop condition is not presently reachable from an HTTP input. The Supabase Auth package is used, but application redirect paths are fixed.
- **Attack scenario:** a malformed Auth path reaches the vulnerable library behavior, or a future/build integration invokes a custom zero-size nanoid generator and hangs.
- **Impact:** low current application risk despite the upstream nanoid HIGH rating; continued use leaves known vulnerable code in the dependency graph.
- **Recommended fix:** update `@supabase/supabase-js` to a supported fixed release (audit suggested 2.112.4) and update the dependency graph so nanoid is at least 3.3.18. Run Auth, callback, SSR-cookie, and production-build regressions. Next 16.3.0 had no npm audit advisory but 16.3.3 was the current patch during this audit.
- **Confidence:** HIGH for versions/advisories; HIGH that current nanoid reachability is low

### SEC-011

- **Category:** Logging / pseudonymous identifiers
- **Severity:** LOW
- **Status:** VULNERABLE
- **Affected file(s):** `src/lib/mocks/on-demand.ts:188,426-434`; `src/app/error.tsx:12-15`
- **Evidence:** generation failure logs include full `userId` and `mockId`; the client global error boundary logs the complete client-visible Error object to the browser console. No credentials, cookies, authorization headers, or raw provider output are logged by application code.
- **Attack scenario:** a user intentionally generates failures and operators forward logs to a broadly accessible third-party sink, exposing stable pseudonymous identifiers and creating noisy log volume.
- **Impact:** privacy/retention concerns and increased exposure of internal correlation identifiers; no direct credential compromise shown.
- **Recommended fix:** hash/truncate user identifiers, define retention/access controls, rate-limit repetitive events, and verify the production logging provider redacts request headers/cookies. Avoid full client errors in production browser consoles.
- **Confidence:** HIGH

### SEC-012

- **Category:** Service-role boundary
- **Severity:** INFO
- **Status:** SAFE
- **Affected file(s):** `src/lib/supabase/admin.ts:1-25`; student data services under `src/lib/{practice,onboarding,tests,learning,results,progress,dashboard}`; Admin data services under `src/lib/admin`
- **Evidence:** the service-role key is confined to a `server-only` module and no client component imports it. Every exposed student mutation authenticates first and passes the fresh user ID; reviewed service-role queries/RPCs enforce owner IDs before returning or mutating data. Sensitive tables/RPCs are revoked from browser roles.
- **Attack scenario:** no current cross-user exploit was identified. The risk is blast radius if a future action omits one ownership filter, because service role bypasses RLS.
- **Impact:** currently none demonstrated; a future omission could become cross-tenant access.
- **Recommended fix:** retain `server-only`, add centralized owner-scoped repository helpers and negative IDOR tests, and prefer authenticated server clients/RPCs using `auth.uid()` where practical. Keep service role for genuinely privileged atomic operations only.
- **Confidence:** HIGH

### SEC-013

- **Category:** Repository update automation
- **Severity:** INFO
- **Status:** POTENTIALLY VULNERABLE
- **Affected file(s):** repository root (no `.github` directory; no Dependabot/Renovate configuration)
- **Evidence:** no CI workflows, workflow permissions, dependency-update bot configuration, or automated security scan configuration exist in the repository.
- **Attack scenario:** known dependency fixes remain unapplied because no automated alert/PR reaches maintainers.
- **Impact:** longer patch latency and dependence on manual release discipline.
- **Recommended fix:** after remediation, add least-privilege CI and Dependabot/Renovate with lockfile review, tests, and protected-branch requirements. Do not grant `write-all` permissions.
- **Confidence:** HIGH

## 20-Issue Checklist

| # | Issue | Status | Severity | Repository-specific evidence / fix |
| ---: | --- | --- | --- | --- |
| 1 | Secret files / `.env` committed | SAFE | INFO | `.env*` ignored except `.env.example`; only placeholder example tracked; local history filename and live-format scans found no secret. Continue secret scanning. |
| 2 | Secret API keys exposed to client | SAFE | INFO | Client code references only Supabase public URL/anon key and public feature flags. Service role is server-only. No AI/provider secret use in client/runtime code. |
| 3 | Supabase RLS | VULNERABLE | HIGH | All tables have RLS, but subscriptions/profile/reports/reviews have over-broad writes. Fix SEC-001 through SEC-004. |
| 4 | Frontend-only authorization | SAFE | INFO | Proxy, pages, route handlers, Server Actions, and RLS all perform server checks; Admin mutations call `requireRole`. |
| 5 | Rate limiting | POTENTIALLY VULNERABLE | MEDIUM | No application Auth limiter; generation is only per-account. Verify provider throttles and fix SEC-005/006. |
| 6 | SQL injection | SAFE | INFO | Supabase query builder/RPC parameters used; no dynamic SQL `EXECUTE`, query concatenation, or interpolated raw SQL found. |
| 7 | Server-side input validation | VULNERABLE | MEDIUM | Exposed actions use Zod/allowlists, but direct RLS writes bypass report/profile/review validation. Fix database permissions/invariants. |
| 8 | XSS / raw HTML | SAFE | INFO | No `dangerouslySetInnerHTML`, raw `innerHTML`, Markdown renderer, or HTML sanitizer need was found; React text rendering escapes content. Add CSP defense. |
| 9 | Password storage | SAFE | INFO | Passwords are passed directly to Supabase Auth; no application password/hash columns or persistence found. |
| 10 | Auth tokens in localStorage | POTENTIALLY VULNERABLE | MEDIUM | No custom token localStorage; Supabase SSR uses cookies. Cookie defaults are JS-readable and do not explicitly set Secure; see SEC-007. |
| 11 | Admin/debug routes | SAFE | INFO | All Admin pages/actions/export are role-guarded; no debug/dev/internal/console routes or environment dump endpoints found. |
| 12 | CORS | NOT APPLICABLE | INFO | No custom CORS headers/middleware or cross-origin credential API found. Existing APIs are same-origin. |
| 13 | Email verification | NEEDS MANUAL VERIFICATION | MEDIUM | Signup behavior depends on hosted Supabase confirmation settings; repository handles both immediate session and check-email flows. |
| 14 | IDOR / ownership | SAFE | INFO | Attempt/session/result/report/bookmark paths bind fresh `user.id`; RPCs re-check `user_id`; negative direct-table privileges protect snapshots. |
| 15 | Mass assignment | VULNERABLE | MEDIUM | Actions allowlist fields, but profile/subscription/review RLS permits broader direct writes; see SEC-001/002/004. |
| 16 | Webhook signatures | NOT APPLICABLE | INFO | No webhook endpoints or payment/email webhook processing exists. |
| 17 | Stack traces/error leakage | POTENTIALLY VULNERABLE | LOW | Global UI is generic; action-level `Error.message` forwarding remains; see SEC-009. |
| 18 | Dependency vulnerabilities | POTENTIALLY VULNERABLE | LOW | npm audit found three advisories; see SEC-010. |
| 19 | Password security | NEEDS MANUAL VERIFICATION | MEDIUM | App requires 8 chars plus letter/number and generic login/reset responses; breached-password protection and hosted policy require Dashboard verification. |
| 20 | File upload security | NOT APPLICABLE | INFO | No file input, multipart handler, Supabase Storage call, upload route, or storage policy found. Verify no manually created production buckets are exposed. |

## Next.js / Supabase Additional Findings

| Area | Status | Evidence / conclusion |
| --- | --- | --- |
| CSRF | SAFE | Mutations are Next Server Actions; installed Next supports Origin/Host checking for Server Actions. Cookies are SameSite=Lax. No credentialed cross-origin route mutation exists. Validate reverse-proxy Host forwarding. |
| Security headers | PARTIAL | nosniff, DENY framing, strict-origin referrer, limited permissions, HSTS present; CSP absent. |
| CSP | POTENTIALLY VULNERABLE | No CSP configured. No current XSS sink found, but auth cookies are JS-readable. |
| Open redirects | SAFE | Application redirects use literal routes or URLs built from validated `NEXT_PUBLIC_APP_URL`; no user-controlled `next`, `returnTo`, or `callbackUrl`. Google `data.url` is supplied by Supabase. |
| Auth callback | SAFE | PKCE code exchange through Supabase; `flow` only selects fixed recovery route; provider errors use a fixed login route. Hosted redirect allowlist remains manual. |
| Session edge cases | SAFE / MANUAL | `auth.getUser()` is used instead of trusting cached client claims; role rows are queried per request/action, so demotion takes effect on the next request. Live multi-tab/refresh behavior requires staging verification. |
| Service role | SAFE WITH HIGH BLAST RADIUS | Server-only; current action ownership checks are consistent. See SEC-012. |
| Server Action authorization | PARTIAL | All sensitive actions authenticate/authorize and validate. Rate limiting and direct-table bypass findings remain. Full matrix below. |
| API route authorization | SAFE | Each sensitive route has its own guard; `/api` proxy exclusion does not create an unguarded current route. |
| RPC security | SAFE | SECURITY DEFINER RPCs use explicit `search_path`, parameterized SQL, invariant checks, and service-role-only EXECUTE grants. |
| SECURITY DEFINER search path | SAFE | All reviewed definer functions set `search_path`; tables are schema-qualified. Confirm production `public` schema CREATE privileges are not granted to untrusted roles. |
| Storage RLS | NOT APPLICABLE / MANUAL | No application buckets or policies. Inspect production buckets manually. |
| Admin generation | SAFE | Admin Server Actions use fresh role checks; request quantity max 20; validation precedes publish; normal users cannot invoke successful mutation. |
| Admin Mock Builder | SAFE | Page and every save/lifecycle action require Admin; Zod caps sections at 10 and question IDs at 100 per section; service data functions are not client imports. |
| Mock attempt integrity | SAFE | Owner and in-progress state checked; active section/time enforced; responses are allowlisted; browser writes revoked; server computes grades/scores. |
| Practice response integrity | SAFE | Answer schema and public response shape checked; answer key comes from private snapshot; RPC locks response and computes aggregates from server-supplied grading. |
| Result/score integrity | SAFE | Client never submits authoritative score/correct count/percentage; `gradeAndSubmitTest` uses immutable private snapshots and updates totals server-side. |
| Snapshot immutability | SAFE | Snapshot tables are inaccessible to browser roles; active responses update separate rows; no exposed action updates private/public snapshots. |
| Admin role storage | SAFE | `user_roles` writes require Admin; signup trigger only adds `student`; profiles contain no Admin flag; fresh DB role reads prevent stale client elevation. |
| Profile update allowlist | VULNERABLE | Server actions allowlist, but direct RLS profile writes do not; see SEC-002. |
| Enumeration | SAFE / PARTIAL | Login and password reset are generic. Resend verification can return provider-dependent success/error timing; provider anti-enumeration requires staging verification. UUID resource errors are mostly generic. |
| DoS inputs | PARTIAL | Zod bounds arrays/strings/counts; Next action body limit adds a framework ceiling. Direct report writes and multi-account generation bypass application assumptions. |
| Generation quantity | SAFE | Admin quantity 1-20; Practice counts 1/5/10/20; diagnostic exactly 15; Mock protocol fixed. No arbitrary million-item count reaches generators. |
| SSRF | NOT APPLICABLE | No server-side `fetch(userUrl)`, axios, remote import, or upload URL fetch. Admin image URL is validated but not server-fetched/rendered by current student components. |
| Secret logging | SAFE / LOW PRIVACY RISK | No tokens/headers/env values logged. Stable user/mock UUIDs are logged on generation failure; see SEC-011. |
| Source maps/debug | SAFE | `productionBrowserSourceMaps` is not enabled; no production debug panel/route found. |
| Next.js env boundary | SAFE | Service role module imports `server-only`; no client component imports it. Public Supabase anon values are the only browser env values. |
| Cache/user data leaks | SAFE | No `unstable_cache`/`use cache` for user data; authenticated pages call cookie-dependent guards; progress API explicitly returns `private, no-store`. |
| Database field exposure | SAFE | Queries use explicit selects; active payloads omit private snapshots; Admin export allowlists columns and pseudonymizes participant IDs. |
| Correct-answer leakage (Mock) | SAFE | `createPracticeSnapshots` removes answer/solution metadata from public snapshots; active attempt query returns only public snapshots and response state. |
| Practice answer leakage | SAFE | feedback with correct answer/explanation is created only after `response_status='answered'`; diagnostic active state never returns private feedback. |
| Client-side Admin data leak | SAFE | Admin components are reached only from server role-guarded pages; no Admin data imports in normal student routes. |
| Error boundaries | SAFE / PARTIAL | Global rendered error is generic; browser console logs full client Error and actions may forward messages. |
| Migration security | PARTIAL | RLS/revokes are extensive, but the broad legacy `grant all privileges on all tables` magnifies policy mistakes. Fix SEC-001 through SEC-004 and verify all migrations are applied. |
| Supabase grants | PARTIAL | Sensitive attempt/snapshot/session tables are revoked. Legacy owner-facing tables retain all privileges; use least-privilege per-operation grants. |
| HTTPS | NEEDS MANUAL VERIFICATION | HSTS header exists, but platform/custom-domain TLS, HTTP redirect, certificate renewal, and first-request behavior are external. |
| Cookie security | POTENTIALLY VULNERABLE | SameSite=Lax/Path=/ present through SDK; Secure absent and HttpOnly false by default. Verify live Set-Cookie. |
| Domain/Auth allowlist | NEEDS MANUAL VERIFICATION | Local config contains localhost; production Site URL and exact callback allowlist must be configured in hosted Supabase. |
| Supply chain | PARTIAL | Lockfile integrity present and install scripts are expected; three advisories and no update automation remain. |
| GitHub hygiene | NOT APPLICABLE / INFO | No GitHub Actions directory exists, so no excessive workflow permissions or unsafe secret interpolation was found. |

## Server Action Matrix

Legend: “Service” means the action or its called data service uses the server-only service-role client. “Provider” rate limit means Supabase/provider controls exist but application settings were not verified.

| Action | File | Auth | Admin | Validation | Ownership | Service Role | Rate Limit | Risk |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `loginAction` | `src/app/auth/actions.ts:51` | Public | No | Zod | N/A | No | Provider only | Medium |
| `registerAction` | `src/app/auth/actions.ts:73` | Public | No | Zod | N/A | No | Provider only | Medium |
| `resendVerificationAction` | `src/app/auth/actions.ts:122` | Public | No | Zod | N/A | No | Provider only | Medium |
| `googleSignInAction` | `src/app/auth/actions.ts:147` | Public | No | No caller data; feature flag | N/A | No | None in app | Low |
| `requestPhoneOtpAction` | `src/app/auth/actions.ts:159` | Public | No | Zod + E.164 normalization | N/A | No | Provider; UI cooldown only | Medium |
| `verifyPhoneOtpAction` | `src/app/auth/actions.ts:213` | Public | No | Zod | N/A | No | Provider only | Medium |
| `forgotPasswordAction` | `src/app/auth/actions.ts:247` | Public | No | Zod | N/A | No | Provider only | Medium |
| `resetPasswordAction` | `src/app/auth/actions.ts:265` | Required recovery session | No | Zod | Current Auth user | No | Provider only | Low |
| `logoutAction` | `src/app/auth/actions.ts:297` | Session if present | No | No input | Current session | No | None | Low |
| `saveThemePreferenceAction` | `src/app/auth/actions.ts:304` | Optional/required to persist | No | Explicit enum guard | `id=user.id` | No | None | Low |
| `saveMarketingPreferencesAction` | `src/app/auth/actions.ts:327` | Required | No | Explicit boolean allowlist | `id=user.id` | No | None | Low; direct RLS bypass SEC-002 |
| `generateEquationPreviewAction` | `src/app/admin/actions.ts:104` | Required | Admin | Zod, quantity max 20 | N/A | Indirect history read | None; Admin-only | Low |
| `publishGeneratedEquationAction` | `src/app/admin/actions.ts:145` | Required | Admin | Zod + deterministic revalidation | N/A | Yes | None; Admin-only | Low |
| `generateLatinPreviewAction` | `src/app/admin/actions.ts:159` | Required | Admin | Zod, quantity max 20 | N/A | Indirect history read | None; Admin-only | Low |
| `publishGeneratedLatinAction` | `src/app/admin/actions.ts:196` | Required | Admin | Zod + deterministic revalidation | N/A | Yes | None; Admin-only | Low |
| `generateFigurePreviewAction` | `src/app/admin/actions.ts:211` | Required | Admin | Zod, quantity max 20 | N/A | Indirect history read | None; Admin-only | Low |
| `publishGeneratedFigureAction` | `src/app/admin/actions.ts:234` | Required | Admin | Zod + deterministic revalidation | N/A | Yes | None; Admin-only | Low |
| `publishGeneratedQuestionsAction` | `src/app/admin/actions.ts:398` | Required | Admin | Batch max 20 + per-item schema | N/A | Yes | None; Admin-only | Low |
| `createQuestionAction` | `src/app/admin/actions.ts:449` | Required | Admin | Zod + edit-ID UUID | N/A | Yes | None; Admin-only | Low |
| `reviewQuestionAction` | `src/app/admin/actions.ts:523` | Required | Reviewer/Admin | Zod | Reviewer ID from guard | Yes | None; privileged | Medium only through direct RLS SEC-004 |
| `questionLifecycleAction` | `src/app/admin/actions.ts:541` | Required | Admin | Zod | N/A | Yes | None; Admin-only | Low |
| `deleteQuestionAction` | `src/app/admin/actions.ts:566` | Required | Admin | Zod UUID | N/A | Yes | None; Admin-only | Low |
| `saveAdminTestAction` | `src/app/admin/actions.ts:592` | Required | Admin | JSON parse then Zod; bounded sections/questions | N/A | Yes | None; Admin-only | Low |
| `adminTestLifecycleAction` | `src/app/admin/actions.ts:666` | Required | Admin | Zod | N/A | Yes | None; Admin-only | Low |
| `startPracticeAction` | `src/app/practice/actions.ts:26` | Required | No | Zod; fixed counts | Current user passed to repository/RPC | Yes | One active session; no IP/global | Medium DoS |
| `showPracticeQuestionAction` | `src/app/practice/actions.ts:38` | Required | No | Zod UUIDs | Session owner + current position | Yes | None | Low |
| `submitPracticeAnswerAction` | `src/app/practice/actions.ts:50` | Required | No | Zod answer union/ranges | Session owner/current item | Yes | Answer lock | Low |
| `nextPracticeQuestionAction` | `src/app/practice/actions.ts:61` | Required | No | Zod UUID | Session owner + answered state | Yes | None | Low |
| `completePracticeAction` | `src/app/practice/actions.ts:72` | Required | No | Zod UUID | Session owner + complete state | Yes | Idempotent completion | Low |
| `abandonPracticeAction` | `src/app/practice/actions.ts:83` | Required | No | Zod UUID | Session owner | Yes | None | Low |
| `openPracticeExplanationAction` | `src/app/practice/actions.ts:95` | Required | No | Zod UUIDs | Session owner + answered item | Yes | Idempotent event | Low |
| `reportPracticeQuestionAction` | `src/app/practice/actions.ts:107` | Required | No | Zod, details max 2,000 | Session/item owner | Yes | None | Medium direct-table bypass SEC-003 |
| `generateCoreMockForCurrentUser` | `src/app/tests/actions.ts:21` | Required | No | Zod UUID request ID + flag | Current user | Yes | Per-user DB cooldown/idempotency | Medium DoS |
| `startTestAction` | `src/app/tests/actions.ts:37` | Required | No | UUID schema | Current user; entitlement | Yes | One active curated attempt per test | Low except SEC-001 |
| `saveTestResponseAction` | `src/app/tests/actions.ts:52` | Required | No | Zod + answer shape | Attempt owner/current section | Yes | None | Low |
| `submitTestAction` | `src/app/tests/actions.ts:68` | Required | No | Zod UUID/boolean | Attempt owner | Yes | Status lock | Low |
| `advanceTestSectionAction` | `src/app/tests/actions.ts:88` | Required | No | Zod UUIDs | Attempt owner/current section | Yes | State/time lock | Low |
| `processTestClockAction` | `src/app/tests/actions.ts:111` | Required | No | Zod UUID | Attempt owner | Yes | None | Low |
| `finishOnboardingAction` | `src/app/onboarding/actions.ts:22` | Required | No | Explicit two-value allowlist | Current profile | Yes | None | Low; direct profile bypass SEC-002 |
| `startDiagnosticAction` | `src/app/onboarding/actions.ts:35` | Required | No | No caller data | Current profile/session | Yes | One initial diagnostic | Low |
| `showDiagnosticQuestionAction` | `src/app/onboarding/actions.ts:45` | Required | No | Zod UUIDs | Profile session + session owner | Yes | None | Low |
| `submitDiagnosticAnswerAction` | `src/app/onboarding/actions.ts:57` | Required | No | Zod answer union/ranges | Profile session + session owner | Yes | Answer lock | Low |
| `nextDiagnosticQuestionAction` | `src/app/onboarding/actions.ts:69` | Required | No | Zod UUID | Profile session + answered state | Yes | None | Low |
| `completeDiagnosticAction` | `src/app/onboarding/actions.ts:80` | Required | No | Zod UUID | Profile/session owner + exactly 15 answers | Yes | Status lock | Low |
| `toggleBookmarkAction` | `src/app/learning/actions.ts:12` | Required | No | Zod UUID/boolean | Current user + published question | Yes | None | Low |
| `saveMistakeEntryAction` | `src/app/learning/actions.ts:34` | Required | No | Zod, note max 2,000 | Current user's incorrect completed response | Yes | None | Low |

## API Route Matrix

| Route / method | Authentication | Authorization | Input validation | Rate limiting | Sensitive operation | Risk |
| --- | --- | --- | --- | --- | --- | --- |
| `GET /auth/callback` | PKCE code exchange or existing Supabase user | Post-auth fixed route | `code` optional; `flow` only acts when exactly `recovery`; no arbitrary redirect | Supabase provider only | Establishes/recovers session | Low; hosted redirect allowlist manual |
| `GET /auth/google` | Public OAuth start | Feature flag; provider URL from Supabase | No caller-controlled redirect | None in app | Starts Google sign-in | Low/Medium abuse; SEC-005 |
| `GET /api/progress` | `requireUser()` | User ID fixed to current user | No input | None | Private progress data | Low; `private, no-store` |
| `GET /admin/analytics/export?format=` | `requireRole([admin])` | Admin only | Exact `jsonl`, else CSV | None; Admin-only | Bulk pseudonymized response analytics | Low |

## RLS Matrix

Effective state assumes all repository migrations are applied in order.

| Table | RLS | SELECT | INSERT | UPDATE | DELETE | Ownership/Admin condition | Risk |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `profiles` | Yes | Owner/Admin | Owner/Admin | Owner/Admin, all columns | No policy | `auth.uid()=id`; Admin override | **Medium: SEC-002** |
| `user_roles` | Yes | Own roles/Admin | Admin | Admin | Admin | role lookup uses fresh `auth.uid()` | Safe |
| `questions` | Yes | Active published+approved; reviewer/Admin all | Admin | Admin | Policy removed; service soft-delete | Publication plus role | Safe; sensitive columns also revoked from public SELECT |
| `question_options` | Yes | Options of visible questions; reviewer/Admin | Admin | Admin | Admin | parent-question visibility | Safe |
| `question_versions` | Yes | Reviewer/Admin | Admin | No policy | No policy | role-based | Safe |
| `tests` | Yes | Published; reviewer/Admin all | Admin | Admin | Admin | publication/role | Safe |
| `test_sections` | Yes | Current sections of published tests; reviewer/Admin all | Admin via FOR ALL | Admin | Admin | current template + parent test | Safe |
| `test_questions` | Yes | Mappings for current published sections; reviewer/Admin | Admin via FOR ALL | Admin | Admin | parent section/test | Safe |
| `test_attempts` | Yes | Owner/Admin policy; authenticated receives safe column SELECT only | Direct privilege revoked | Direct privilege revoked | Direct privilege revoked | owner; service actions | Safe |
| `user_responses` | Yes | Owner/Admin policy, but direct privileges revoked | Revoked | Revoked | Revoked | parent attempt owner; service actions | Safe |
| `practice_attempt_items` | Yes | Admin policy only | Revoked | Revoked | Revoked | service-only snapshots | Safe |
| `bookmarks` | Yes | Owner/Admin | Owner/Admin | Owner/Admin | Owner/Admin | `auth.uid()=user_id` | Safe |
| `question_reports` | Yes | Reporter or reviewer/Admin | Reporter with weak source/size invariant | Reviewer/Admin | No explicit delete policy | reporter/roles | **Medium: SEC-003** |
| `user_topic_performance` | Yes | Owner/Admin | Owner/Admin | Owner/Admin | Owner/Admin | `auth.uid()=user_id` | Low future integrity; current progress derives from snapshots |
| `study_plans` | Yes | Owner/Admin | Owner/Admin | Owner/Admin | Owner/Admin | `auth.uid()=user_id` | Safe own data |
| `study_tasks` | Yes | Parent plan owner/Admin | Parent plan owner/Admin | Parent plan owner/Admin | Parent plan owner/Admin | parent ownership | Safe own data |
| `question_reviews` | Yes | Reviewer/Admin | Any reviewer/Admin, any reviewer ID | Any reviewer/Admin, any row | Any reviewer/Admin, any row | role only | **Medium: SEC-004** |
| `subscriptions` | Yes | Owner/Admin | Owner/Admin | Owner/Admin | Owner/Admin | `auth.uid()=user_id` | **High: SEC-001** |
| `audit_logs` | Yes | Admin | Admin | No policy | No policy | Admin role | Safe |
| `mistake_notebook_entries` | Yes | Owner/Admin | Owner/Admin | Owner/Admin | Owner/Admin | owner; DB note max 2,000 | Safe |
| `fidelity_audit_samples` | Yes | Reviewer/Admin | Admin | No policy | No policy | roles | Safe |
| `fidelity_audit_reviews` | Yes | Reviewer/Admin | Own reviewer row + role | Own row or Admin | No policy | `reviewer_id=auth.uid()` | Safe |
| `generated_core_mocks` | Yes | No browser policy | Revoked | Revoked | Revoked | service-only | Safe |
| `core_mock_generation_events` | Yes | No browser policy | Revoked | Revoked | Revoked | service-only | Safe |
| `practice_sessions` | Yes | No browser policy | Revoked | Revoked | Revoked | service-only + application owner checks | Safe |
| `practice_session_items` | Yes | No browser policy | Revoked | Revoked | Revoked | service-only private snapshots | Safe |
| `practice_events` | Yes | No browser policy | Revoked | Revoked | Revoked | service-only | Safe |

## Supabase RPC and Function Audit

| Function | SECURITY DEFINER | Search path | Caller grants | Ownership/invariants | Risk |
| --- | --- | --- | --- | --- | --- |
| `current_user_has_role`, `current_user_has_any_role` | Yes | `public` | Default callable helper | Uses `auth.uid()` and `public.user_roles` | Safe; verify no untrusted CREATE on `public` |
| `handle_new_user` | Yes | `public, auth` | Trigger | Always inserts `student`; consent values are bounded booleans | Safe |
| `create_core_mock_attempt` | Yes | `public` | service_role only | Manifest count/nonempty checks; called after Admin-client assembly | Safe; trusts service caller's user ID |
| `reserve_generated_core_mock` | Yes | `public` | service_role only | Per-user advisory lock, idempotency, cooldown max 300 | Safe against same-user races; SEC-006 remains |
| `persist_generated_core_mock_attempt` | Yes | `public` | service_role only | Locks reservation owner/status; atomic attempt/item/response persistence | Safe |
| `fail_generated_core_mock` | Yes | `public` | service_role only | user/mock/status constrained; reason truncated | Safe |
| `fill_attempt_item_keys`, `fill_response_question_key` | No | `public` | Trigger functions | Copies stable keys | Safe |
| `create_practice_session` | Yes | `public` | service_role only | strict enums/counts/manifests; per-user lock; one active session | Safe |
| `record_practice_answer` | Yes | `public` | service_role only | user/session/current item/expiry/lock/range checks | Safe; grade boolean trusted only from service caller |
| `advance_practice_question` | Yes | `public` | service_role only | owner, state, answered-current checks | Safe |
| `open_practice_explanation` | Yes | `public` | service_role only | owner and answered-item checks | Safe |
| `complete_practice_session` | Yes | `public` | service_role only | owner, state, all-answer checks | Safe |
| `abandon_practice_session` | Yes | `public` | service_role only | owner and in-progress checks | Safe |
| `create_initial_core_diagnostic` | Yes | `public` | service_role only | one-time state, per-user lock, exactly 15 and 5+5+5 manifest | Safe |
| `complete_initial_core_diagnostic` | Yes | `public` | service_role only | owner/session/status/exactly 15 answers | Safe |
| `set_updated_at` | No | default | Trigger | no dynamic SQL | Safe |

No dynamic SQL `EXECUTE`, unsafe `format()`, identifier interpolation, or unparameterized query construction was found in migrations.

## Secrets Matrix

Secret values were never printed or copied into this report.

| Location/type | Tracked? | Evidence | Status / action |
| --- | --- | --- | --- |
| `.env.local` | No | `.gitignore:33-35`; `git ls-files` excludes it | SAFE; contains configured values locally and must remain untracked |
| `.env.example` | Yes | only env-like tracked file; all credential fields classified as placeholders and do not match local credentials | SAFE |
| Local Git history | N/A | history filename scan found only `.env.example`; redacted live-format scan found no key/JWT/private-key patterns | SAFE within locally available history |
| Source/docs/tests/reports | Yes/untracked mix | redacted pattern scan found no OpenAI-style, Google API, GitHub, AWS, JWT, or private-key material | SAFE |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public by design | client/server/proxy use it with RLS | SAFE; not a secret |
| `SUPABASE_SERVICE_ROLE_KEY` | Private | referenced only by env schema, server-only Admin client, and a local audit script | SAFE in source; rotate only if external evidence shows prior disclosure |
| OpenAI/Gemini/NVIDIA/OpenRouter/SMTP/payment keys | Not referenced by runtime code | no corresponding env-variable use or client import found | NOT APPLICABLE to current runtime; any separately configured key must remain server-only |
| Credentials/private key files | No tracked files | `.pem` ignored; no `.key`, `.p12`, credential, or private-key file tracked | SAFE |

No evidence supports key rotation from this repository audit. If remote Git history differs from the local history, run a remote secret scanner before release.

## Dependency Findings

Read-only commands run: `npm audit --json`, `npm outdated --json`, `npm ls nanoid @supabase/auth-js @supabase/supabase-js --all`.

| Package | Installed | Advisory severity | Direct/transitive | Advisory | Reachability/relevance | Recommended version/action |
| --- | ---: | --- | --- | --- | --- | --- |
| `nanoid` | 3.3.17 | HIGH | Transitive via Next/PostCSS | GHSA-2v37-7h3g-55p8 | Custom zero-size generator loop; no application call or HTTP path found; build-tool reachability low | Resolve to >=3.3.18 and rebuild |
| `@supabase/auth-js` | 2.68.0 | LOW | Transitive via Supabase JS | GHSA-8r88-6cj9-9fh5 | Auth is used, but app paths/redirects are fixed; update rather than rely on reachability | Update through fixed Supabase JS |
| `@supabase/supabase-js` | 2.49.1 | LOW | Direct | via vulnerable Auth JS | Core Auth/DB dependency; audit proposed 2.112.4 | Upgrade with SSR/Auth regression tests |

Audit totals: **0 critical, 1 high, 0 moderate, 2 low, 0 info**. Application severity is assessed as LOW because the upstream HIGH nanoid path is not reachable from request-controlled code found here.

Freshness observations (not automatically vulnerabilities): Next 16.3.3, `@supabase/supabase-js` 2.112.4, and `@supabase/ssr` 0.12.5 were latest at audit time. Major/minor upgrades require compatibility review; npm audit did not flag Next 16.3.0.

## Security Header Findings

| Header/control | Current state | Assessment | Recommended production state |
| --- | --- | --- | --- |
| `Content-Security-Policy` | Missing | Gap; SEC-007 | Nonce/hash-based policy covering only app, required Next assets, Supabase Auth/API, and required image/font origins |
| `X-Content-Type-Options` | `nosniff` | SAFE | Retain |
| `X-Frame-Options` | `DENY` | SAFE | Retain; also add CSP `frame-ancestors 'none'` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | SAFE | Retain |
| `Permissions-Policy` | camera/microphone/geolocation disabled | SAFE for current product | Retain and extend only as product needs change |
| `Strict-Transport-Security` | `max-age=31536000` | Partial | Verify HTTPS first; consider `includeSubDomains` and preload only when every subdomain is HTTPS-ready |
| `poweredByHeader` | disabled | SAFE | Retain |
| HTTPS redirect | Hosting-dependent | NEEDS MANUAL VERIFICATION | Permanent HTTP→HTTPS at edge, valid cert, renewal monitoring |
| Auth cookie flags | SameSite=Lax, Path=/, HttpOnly=false, no explicit Secure | Gap; SEC-007 | Verify live cookie; Secure in production; reassess HttpOnly architecture |

## Manual Supabase Dashboard Checks

These cannot be proven from repository state and are release gates:

1. **Auth → URL Configuration:** production Site URL is the exact canonical HTTPS origin; redirect allowlist contains only exact local/staging/production callback URLs and no broad wildcard.
2. **Auth → Providers → Email:** confirmation is required before meaningful access; secure email-change confirmation behavior is enabled; production SMTP is configured and monitored.
3. **Auth → Attack Protection:** CAPTCHA/bot protection enabled for signup, recovery, and OTP where supported; Auth endpoint rate limits reviewed for expected launch traffic.
4. **Auth → Password Security:** minimum length/complexity aligns with policy; leaked-password protection enabled; password reuse/expiry choices documented if available.
5. **Auth → Sessions:** JWT expiry, refresh-token rotation/reuse interval, single-session/MFA choices, and sign-out behavior reviewed. Local config proposes one-hour JWT plus rotation.
6. **Auth → MFA:** decide whether Admin/reviewer accounts require MFA; repository currently enforces roles but not MFA assurance.
7. **Google provider:** exact authorized origins and Supabase callback; identity-linking behavior; provider secret stored only in Supabase.
8. **Phone provider:** OTP expiry/resend/rate settings, CAPTCHA, geographic controls, sender/compliance requirements, spend limits, and alerting.
9. **Database → Migrations:** verify all 21 migrations, especially the revoke/grant and latest auth/mock-template migrations, are applied to the target project in order.
10. **Database → RLS/grants:** query live `pg_policies`, table grants, function grants, and `public` schema CREATE privileges; confirm no Dashboard/manual policy diverges from repository migrations.
11. **Database/network:** connection restrictions, database password rotation history, pooler/TLS settings, backups, PITR, and access logging.
12. **Storage:** verify no manually created public buckets or permissive `storage.objects` policies exist.
13. **Secrets:** production env contains correct project URL/anon key/service role; service role is server-only; hosting preview logs do not print env values.
14. **Custom domain/HTTPS:** certificate active, HTTP redirects before app origin, HSTS observed, cookie flags verified with browser/network inspection.
15. **Operational monitoring:** alerts for Auth 429s, OTP/SMS spend, generation load/failures, report spam, Admin mutations, and database growth.

## Deployment Verdict

# NOT READY FOR PUBLIC DEPLOYMENT

The verdict is driven by a concrete HIGH entitlement escalation and multiple MEDIUM direct-database write bypasses, not by generic Supabase/Next.js concerns. The student authentication, owner-scoped attempt logic, Admin server guards, score computation, and answer-key isolation are strong, but those controls do not compensate for authenticated PostgREST writes that bypass action allowlists. Production Auth/domain/rate/HTTPS settings also remain unverified.

## Prioritized Remediation Plan

### P0 — MUST FIX BEFORE DEPLOYMENT

| Finding | Recommended change | Complexity |
| --- | --- | --- |
| SEC-001 | Revoke student subscription mutations; owner SELECT only; trusted service/Admin mutation; add denial tests | Small |
| SEC-002 | Restrict profile column writes; make diagnostic/workflow fields service-only; add direct REST tests | Medium |
| SEC-003 | Remove/bound direct report INSERT, add DB size/source/rate invariants | Medium |
| SEC-004 | Split review policies; bind reviewer ID; make review history immutable or owner/Admin controlled | Small |
| SEC-005 | Verify Supabase Auth throttles/CAPTCHA and add application/IP protection for public Auth flows | Medium |
| SEC-008 | Complete and record all production Supabase Auth, email, redirect, database, and HTTPS manual checks | Small |

### P1 — FIX IMMEDIATELY AFTER / BEFORE LAUNCH

| Finding | Recommended change | Complexity |
| --- | --- | --- |
| SEC-006 | Keep on-demand mocks disabled until shared quotas/global concurrency protection are deployed | Medium |
| SEC-007 | Add tested CSP; set/verify Secure cookie and HTTPS enforcement; assess HttpOnly-compatible architecture | Medium |
| SEC-009 | Replace raw `Error.message` forwarding with typed safe action errors | Small |
| SEC-010 | Upgrade Supabase and nanoid dependency paths, then run full Auth/build regression | Medium |

### P2 — HARDENING

| Finding | Recommended change | Complexity |
| --- | --- | --- |
| SEC-011 | Pseudonymize logged user IDs; define log access/retention/redaction controls | Small |
| SEC-012 | Reduce service-role usage and centralize owner-scoped repositories/negative IDOR tests | Large |
| SEC-005/006 | Add abuse dashboards, anomaly alerts, per-feature budgets, and incident runbooks | Medium |

### P3 — OPTIONAL

| Finding | Recommended change | Complexity |
| --- | --- | --- |
| SEC-013 | Add least-privilege CI plus Dependabot/Renovate and scheduled audit checks | Small |
| Headers | Consider COOP/CORP after compatibility testing; consider HSTS preload only when domain estate is ready | Small |
| Admin assurance | Require MFA/re-authentication for high-impact Admin publish/delete actions | Medium |

## Audit Coverage Confirmation

- [x] secrets / env
- [x] client key exposure
- [x] RLS and grants matrix
- [x] frontend-only permissions
- [x] rate limits
- [x] SQL injection and RPC dynamic SQL
- [x] server validation and mass assignment
- [x] XSS/raw HTML
- [x] password storage and policy
- [x] token/cookie storage
- [x] Admin/debug routes and every Admin mutation
- [x] CORS and CSRF
- [x] email verification and Auth callback
- [x] IDOR/ownership
- [x] webhooks
- [x] production errors/logging
- [x] dependencies/supply chain/GitHub hygiene
- [x] file uploads/storage
- [x] security headers/CSP/HTTPS/domain allowlist
- [x] service-role use and Next.js env boundary
- [x] Server Action and API route matrices
- [x] Supabase RPC/SECURITY DEFINER/search_path
- [x] Practice/Mock/score/snapshot integrity
- [x] Admin role escalation and profile allowlist
- [x] DoS quantity/large inputs/SSRF
- [x] caching/data leaks/correct-answer leakage
- [x] migrations and Supabase grants

