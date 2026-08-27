# PrepDMAT Security Remediation Report

Remediation date: 2026-08-27  
Source audit: `reports/security/pre-production-security-audit.md`  
Scope: repository implementation and local verification; no production or staging dashboard settings were changed

## Outcome

All concrete repository vulnerabilities identified in SEC-001 through SEC-007 and SEC-009 through SEC-013 have an implemented control or an explicitly retained defense-in-depth boundary. SEC-008 remains a staging/manual configuration gate because hosted Supabase Auth, CAPTCHA, redirect, email, domain, and TLS settings cannot be established from source code.

The security migration chain now ends at `supabase/migrations/202608270023_fix_security_rate_limit_timestamp.sql`. A later sanitized live probe confirmed that the configured remote project contains the table and RPC from `202608270022_security_remediation.sql`, but its valid limiter calls fail with SQLSTATE `42883` because the original PL/pgSQL variable `current_time` collides with PostgreSQL's `CURRENT_TIME` keyword. Migration `023` replaces that variable with `v_now` and must be applied before Auth or generation can pass the fail-closed limiter. The executable pgTAP denial suite is `supabase/tests/rls_security_remediation.test.sql`; it could not be executed locally because neither Supabase CLI nor `psql` is installed. It is therefore a mandatory staging verification step, not claimed as a local pass.

## Finding remediation

### SEC-001 — subscription entitlement escalation

1. **Original finding:** authenticated students could create or mutate their own `subscriptions` rows and satisfy premium entitlement checks.
2. **Root cause:** a broad authenticated table grant combined with an owner-scoped `FOR ALL` RLS policy treated self-authored billing state as trusted.
3. **Exact remediation:** legacy policy removed; owner/Admin SELECT separated from Admin-only INSERT/UPDATE/DELETE; anonymous access removed; service-role access retained. Free-launch access is now an explicit `FREE_LAUNCH_ACCESS_ENABLED` application policy and does not create fake subscription rows.
4. **Files:** migration, `.env.example`, `src/lib/validators/env-schema.ts`, `src/lib/tests/data.ts`.
5. **Migration:** `202608270022_security_remediation.sql`.
6. **Tests:** pgTAP denies student insert, status/customer changes, and delete; proves Admin insert. Vitest verifies policy and free-launch contracts.
7. **Before:** a Student JWT could directly insert `status='active'` for its own user ID.
8. **After:** the same direct mutation is rejected by RLS; launch access is independent of billing data.
9. **Verification:** static security contract passed; TypeScript/build/full suite passed. Live PostgREST denial awaits staging pgTAP.
10. **Manual action:** apply the migration and run pgTAP against staging before traffic.
11. **Remaining risk:** future paid rollout needs a verified billing webhook/Admin workflow and provider-specific uniqueness/idempotency.
12. **Blocker:** repository blocker resolved; staging verification required.

### SEC-002 — profile mass assignment

1. **Original finding:** owners could directly update diagnostic, onboarding, consent, and other workflow-owned profile fields.
2. **Root cause:** full-table authenticated UPDATE plus an owner-row policy did not constrain columns.
3. **Exact remediation:** browser INSERT/UPDATE grants and profile write policies removed. Theme and marketing preference actions authenticate with the SSR client, then use exact service-side field allowlists.
4. **Files:** migration and `src/app/auth/actions.ts`.
5. **Migration:** `202608270022_security_remediation.sql`.
6. **Tests:** pgTAP denies forged diagnostic and consent changes; Vitest verifies no profile UPDATE grant and the service action allowlists.
7. **Before:** a Student JWT could PATCH its own protected workflow state.
8. **After:** direct profile mutation has no browser grant/policy; existing legitimate actions update only enumerated fields for the fresh authenticated user.
9. **Verification:** static contract, lint, typecheck, action tests, full suite, and build passed.
10. **Manual action:** run staging profile/theme/consent and diagnostic resume flows after migration.
11. **Remaining risk:** future profile fields must be added deliberately to a server allowlist, not by restoring broad UPDATE.
12. **Blocker:** repository blocker resolved; staging flow verification required.

### SEC-003 — report provenance and abuse bypass

1. **Original finding:** authenticated callers could bypass the report action, submit unbounded text, report questions they did not encounter, and pollute the queue.
2. **Root cause:** direct INSERT plus a weak reporter-only policy; action validation was not mirrored by the database.
3. **Exact remediation:** direct browser report INSERT/UPDATE removed; trusted service insertion must pass a database trigger that binds reporter, practice encounter, and question; enforces initial state and 2,000-character maximum; and serializes duplicate detection with an advisory lock.
4. **Files:** migration and `src/lib/practice/data.ts`.
5. **Migration:** `202608270022_security_remediation.sql`.
6. **Tests:** pgTAP denies direct insert, oversized details, spoofed ownership, and duplicate reports; accepts a legitimate encountered-question report.
7. **Before:** direct PostgREST calls bypassed the secure action.
8. **After:** browser writes are denied and even service writes fail closed when provenance/state/size/duplicate invariants are invalid.
9. **Verification:** static trigger contract and application tests passed; live trigger execution awaits staging pgTAP.
10. **Manual action:** apply migration; test normal reporting and duplicate/large/spoofed requests in staging.
11. **Remaining risk:** operational report-volume alerts and retention are still external controls.
12. **Blocker:** repository blocker resolved; staging database verification required.

### SEC-004 — reviewer attribution and history integrity

1. **Original finding:** any reviewer could impersonate another reviewer or update/delete another review.
2. **Root cause:** one role-only `FOR ALL` policy did not bind `reviewer_id` or preserve append-only history.
3. **Exact remediation:** split policies; INSERT requires `reviewer_id=auth.uid()` and Reviewer/Admin role; no authenticated UPDATE grant/policy; delete is Admin-only. Existing action still derives reviewer identity from fresh authentication.
4. **Files:** migration and `src/app/admin/actions.ts` safe boundary changes.
5. **Migration:** `202608270022_security_remediation.sql`.
6. **Tests:** pgTAP denies impersonation, update, Reviewer deletion, and Student insertion; proves Admin deletion.
7. **Before:** a Reviewer JWT could rewrite audit history or attribute a decision to another UUID.
8. **After:** reviewer decisions are append-only and self-attributed; destructive removal requires Admin.
9. **Verification:** static policy contract and full Admin regression suite passed; live RLS awaits staging pgTAP.
10. **Manual action:** exercise Reviewer submission and Admin governance in staging.
11. **Remaining risk:** production audit-log retention and Admin high-assurance/MFA policy remain operational choices.
12. **Blocker:** repository blocker resolved; staging role verification required.

### SEC-005 — authentication throttling

1. **Original finding:** public login/signup/resend/recovery/OTP/OAuth starts relied only on unknown provider controls.
2. **Root cause:** no shared application limiter and no trustworthy proxy-aware IP policy.
3. **Exact remediation:** database-backed atomic fixed-window limits protect login, signup, resend, password-reset request, phone request/verification, and Google OAuth start. Account values/IPs are HMAC-derived before storage. The limiter fails closed. `TRUSTED_CLIENT_IP_HEADER` defaults to `none`; global/account limits remain active until an edge-overwritten header is explicitly selected.
4. **Files:** migration, `src/lib/security/rate-limit.ts`, env schema/example, auth actions, Google route, and deployment documentation.
5. **Migration:** `022` creates service-only `security_rate_limits` and `consume_security_rate_limit`; corrective migration `023` fixes the timestamp variable collision without changing policy or permissions.
6. **Tests:** Vitest verifies every public Auth entry point is protected and covers successful login, invalid credentials, unverified email, rate limiting, database failure, and provider failure. pgTAP proves authenticated callers cannot invoke the limiter RPC directly and now executes both the allow and deny limiter paths.
7. **Before:** automation could call actions while ignoring UI cooldowns until provider throttles intervened.
8. **After:** shared server-side account/global and optional trusted-IP budgets run before provider calls; unavailable controls deny the action safely.
9. **Verification:** targeted Auth/security tests and full suite passed.
10. **Manual action:** configure a dedicated 32+ character `SECURITY_RATE_LIMIT_SECRET`; verify trusted edge header, Supabase Auth limits, CAPTCHA, 429 behavior, and alerts.
11. **Remaining risk:** distributed bot accounts need CAPTCHA/WAF/provider controls; fixed windows need monitoring and stale-row maintenance.
12. **Blocker:** application control resolved; external CAPTCHA/Auth configuration remains a staging gate.

### SEC-006 — expensive generation abuse

1. **Original finding:** per-account session/cooldown controls did not stop multi-account or distributed compute abuse.
2. **Root cause:** no shared global/IP/user budget around expensive generation.
3. **Exact remediation:** Practice, Diagnostic, and on-demand Mock generation now use the shared limiter. Mock limiting occurs only after the existing disabled-by-default feature gate; no generator algorithm, threshold, retry, or quality rule changed.
4. **Files:** `src/app/practice/actions.ts`, `src/app/onboarding/actions.ts`, `src/app/tests/actions.ts`, limiter and env files.
5. **Migration:** shared limiter table/RPC.
6. **Tests:** Vitest asserts all three entry points and preserves the Mock feature-gate ordering; existing generation suites passed.
7. **Before:** many accounts could request expensive work concurrently within their individual cooldowns.
8. **After:** per-user, optional trusted-IP, and global budgets reject excess requests before generation.
9. **Verification:** all 612 active tests passed, including frozen generator suites.
10. **Manual action:** load-test selected budgets in staging and configure CPU/failure alerts; keep on-demand Mock disabled until approved.
11. **Remaining risk:** a database limiter is not a global execution semaphore; queue/concurrency controls may be needed at higher scale.
12. **Blocker:** launch-stage repository blocker resolved with feature still disabled; load verification required before enabling Mock generation.

### SEC-007 — CSP and session cookie hardening

1. **Original finding:** no CSP; production `Secure` was not explicit on Supabase SSR cookies; `HttpOnly` was unavailable under the current browser refresh architecture.
2. **Root cause:** framework/library defaults were used without application hardening.
3. **Exact remediation:** proxy-generated per-request nonce CSP with nonce-only scripts, `strict-dynamic`, exact Supabase HTTP/WebSocket origins, locked object/base/form/frame sources, and production insecure-request upgrade. Production cookies force `Secure`, default `SameSite=Lax` and `/`, while preserving Supabase's required browser-readable cookie model.
4. **Files:** `src/lib/security/csp.ts`, `src/lib/security/cookies.ts`, `src/proxy.ts`, Supabase server/proxy clients, `next.config.ts`.
5. **Migration:** none.
6. **Tests:** CSP and cookie contracts verify no script `unsafe-inline`, exact origins, and production flags.
7. **Before:** a future injection had no CSP containment and cookie transport relied on defaults.
8. **After:** Next receives a fresh nonce on request headers and documents return CSP; cookies are Secure in production.
9. **Verification:** Next 16.3.3 production build passed and enumerated all routes under the proxy.
10. **Manual action:** browser-test normal flows, injected inline-script blocking, HTTPS redirect, live cookie attributes, and CSP console/network results.
11. **Remaining risk:** `style-src 'unsafe-inline'` remains for bounded computed widths; access tokens remain browser-readable by design, so XSS prevention and RLS are essential.
12. **Blocker:** repository control resolved; live browser/edge verification required.

### SEC-008 — hosted Auth/domain configuration

1. **Original finding:** email confirmation, CAPTCHA, password/session controls, redirect allowlist, providers, custom domain, and HTTPS could not be proven from source.
2. **Root cause:** these controls are owned by Supabase, OAuth/SMS providers, and the hosting edge.
3. **Exact remediation:** repository now documents a strict manual checklist and keeps Google/phone disabled until explicitly configured; no unverifiable claim was encoded as application state.
4. **Files:** `docs/AUTH-DEPLOYMENT.md` and existing provider feature flags.
5. **Migration:** none.
6. **Tests:** Auth provider flag/default contracts passed.
7. **Before:** deployment could silently rely on insecure dashboard defaults.
8. **After:** the release procedure explicitly blocks enablement until exact settings and live flows are evidenced.
9. **Verification:** repository documentation/flag behavior verified; hosted state not verified.
10. **Manual action:** complete every external-dashboard checklist item and retain staging evidence.
11. **Remaining risk:** all hosted control effectiveness remains unknown until checked in the actual project.
12. **Blocker:** not a repository blocker; mandatory staging security gate.

### SEC-009 — raw error disclosure

1. **Original finding:** Server Actions and server-rendered page error states could forward arbitrary downstream `Error.message` values.
2. **Root cause:** catch-all convenience behavior did not distinguish declared public domain errors from provider/database errors.
3. **Exact remediation:** introduced typed public error codes and safe fallback helpers; action catches now expose only allowlisted domain errors or generic messages. Student/Admin page load failures no longer render arbitrary exception text.
4. **Files:** `src/lib/security/public-errors.ts`, Admin/Learning/Onboarding/Practice/Test actions, and affected Student/Admin pages.
5. **Migration:** none.
6. **Tests:** static boundary tests reject raw action/page `error.message` forwarding.
7. **Before:** a future unwrapped database/provider message could reach the caller.
8. **After:** unknown exceptions collapse to stable public messages/codes.
9. **Verification:** targeted security tests, lint, typecheck, full suite, and build passed.
10. **Manual action:** confirm production error observability still captures useful sanitized correlation data.
11. **Remaining risk:** every future route/action must use the same typed boundary.
12. **Blocker:** resolved.

### SEC-010 — dependency vulnerabilities

1. **Original finding:** one HIGH transitive nanoid advisory and two LOW Supabase/Auth advisories.
2. **Root cause:** stale exact dependency pins and a vulnerable transitive resolution.
3. **Exact remediation:** Next and ESLint config upgraded to 16.3.3; Supabase JS/SSR upgraded to a compatible Node 20 pair (2.100.1/0.10.0); nanoid overridden to 3.3.18. Versions are exact-pinned and lockfile integrity retained.
4. **Files:** `package.json`, `package-lock.json`.
5. **Migration:** none.
6. **Tests:** Auth/security/full regressions and production build passed.
7. **Before:** audit reported 1 high and 2 low vulnerabilities.
8. **After:** `npm audit --audit-level=low` reports zero vulnerabilities.
9. **Verification:** npm audit and installed dependency tree.
10. **Manual action:** use Node 22 in CI/deployment; the local Node 20.16 runtime emits a dev-only ESLint engine warning requiring Node 20.19+.
11. **Remaining risk:** new advisories can appear after this dated audit.
12. **Blocker:** resolved at audit time.

### SEC-011 — logging privacy

1. **Original finding:** generation logs exposed complete stable user/mock UUIDs and the client boundary logged full Error objects.
2. **Root cause:** raw identifiers/errors were used for debugging correlation.
3. **Exact remediation:** identifiers are represented by short one-way SHA-256 correlation references; generation logs retain only safe reason/error names; client global logging emits only a framework digest or a fixed unavailable marker.
4. **Files:** `src/lib/security/logging.ts`, `src/lib/mocks/on-demand.ts`, `src/app/error.tsx`.
5. **Migration:** none.
6. **Tests:** on-demand failure tests exercised sanitized log objects; source scan found no credential/header logging.
7. **Before:** log readers could correlate full account/mock UUIDs.
8. **After:** logs support incident correlation without emitting the raw identifiers or Error object.
9. **Verification:** targeted Mock tests and full suite passed.
10. **Manual action:** configure log access, retention, request-header/cookie redaction, sampling, and alerts at the host.
11. **Remaining risk:** deterministic short hashes are pseudonymous, not anonymous, and must still be access-controlled.
12. **Blocker:** repository issue resolved; operational policy remains.

### SEC-012 — service-role boundary

1. **Original finding:** no exploit found, but the service role creates high blast radius if a future owner check is omitted.
2. **Root cause:** privileged atomic workflows require an RLS-bypassing server client.
3. **Exact remediation:** retained the existing `server-only` boundary; browser roles were reduced to explicit grants; privileged functions were globally revoked and regranted only to `service_role`; new profile/report/rate-limit operations authenticate and bind the fresh user before privileged access.
4. **Files:** migration, Supabase Admin boundary, affected actions/data services, security tests.
5. **Migration:** function/table/schema/default-privilege revocations.
6. **Tests:** pgTAP negative owner/role/RPC cases; source scan confirmed service credential references only in server/env/test code and no browser Admin-client call site.
7. **Before:** current code was safe but broad grants and future drift increased blast radius.
8. **After:** browser API surface is deny-by-default and the service boundary remains isolated.
9. **Verification:** local static boundary scan and complete app suite passed.
10. **Manual action:** verify the service key is server-only in hosting, rotate if external evidence shows exposure, and run staging cross-user ID substitution tests.
11. **Remaining risk:** service-role correctness still depends on fresh auth plus explicit ownership in each future action.
12. **Blocker:** no current exploit; defense-in-depth strengthened.

### SEC-013 — security automation

1. **Original finding:** no CI or dependency-update automation existed.
2. **Root cause:** security checks depended entirely on local release discipline.
3. **Exact remediation:** added least-privilege GitHub Actions checks for clean install, audit, lint, typecheck, tests, and build on PR/main/weekly/manual runs; added grouped weekly Dependabot updates with a bounded PR count.
4. **Files:** `.github/workflows/security.yml`, `.github/dependabot.yml`.
5. **Migration:** none.
6. **Tests:** workflow commands were executed locally; workflow itself awaits GitHub execution.
7. **Before:** known fixes could remain unapplied without automated notice.
8. **After:** repository changes receive repeatable security/regression checks and dependency update PRs.
9. **Verification:** YAML reviewed; all job commands pass locally.
10. **Manual action:** enable Actions/Dependabot, protect `main`, require the workflow, and review first scheduled run.
11. **Remaining risk:** GitHub organization settings and action pinning policy remain external.
12. **Blocker:** repository configuration resolved; platform enablement remains.

## Final finding table

| Finding | Before | After | Verified locally | Manual action |
| --- | --- | --- | --- | --- |
| SEC-001 | Student-controlled entitlement | Admin/service mutation; explicit free-launch policy | Static + app tests | Staging pgTAP/PostgREST |
| SEC-002 | Full own-profile writes | Service allowlists only | Static + app tests | Staging profile/diagnostic flows |
| SEC-003 | Direct unbounded reports | Service-only + DB invariants | Static + app tests | Staging trigger/pgTAP |
| SEC-004 | Reviewer impersonation/history edits | Self-attributed append-only; Admin delete | Static + app tests | Staging role tests |
| SEC-005 | Provider-only throttles | Shared atomic limiter | Auth/security tests | CAPTCHA, edge header, hosted limits |
| SEC-006 | Account-only generation controls | User/global/optional-IP budgets | Full generator suite | Staging load/alert tests |
| SEC-007 | No CSP; implicit cookie transport | Nonce CSP; production Secure | Contract + build | Live browser/HTTPS inspection |
| SEC-008 | Hosted settings unknown | Explicit gated checklist | Flags/docs only | Complete all hosted checks |
| SEC-009 | Raw exception forwarding | Typed/generic public errors | Static + full suite | Monitor production errors |
| SEC-010 | 1 high + 2 low advisories | 0 audit vulnerabilities | npm audit + build | Ongoing update review |
| SEC-011 | Raw UUID/Error logging | Pseudonymous references/safe fields | Mock tests + scan | Retention/access controls |
| SEC-012 | Safe but broad blast radius | Deny-by-default browser grants/functions | Static + full suite | Hosting secret/IDOR verification |
| SEC-013 | No security automation | Least-privilege CI + Dependabot | Commands local | Enable/require in GitHub |

## Database least-privilege matrix

The matrix describes effective browser grants after the new migration. `service_role` bypasses RLS and remains restricted to server-only application code. Admin/Reviewer application mutations still pass fresh server role guards before service operations.

| Table | Anonymous | Student/authenticated | Reviewer/Admin authenticated | Service role | RLS / justification |
| --- | --- | --- | --- | --- | --- |
| `profiles` | none | SELECT own | Admin SELECT by RLS | CRUD | profile writes are server allowlists |
| `user_roles` | none | SELECT own | Admin SELECT by RLS | CRUD | fresh role lookup; no browser mutation |
| `questions` | safe-column SELECT published | same | safe-column SELECT all role-visible | CRUD | keys/explanations/structured data excluded |
| `question_options` | SELECT visible parents | same | SELECT role-visible parents | CRUD | option text is public; correctness is not stored here |
| `question_versions` | none | none | none direct | CRUD | privileged history only |
| `tests` | safe-column SELECT published | same | safe-column SELECT role-visible | CRUD | premium/creator fields excluded |
| `test_sections` | SELECT current published | same | SELECT role-visible | CRUD | current published structure only |
| `test_questions` | SELECT current published mappings | same | SELECT role-visible mappings | CRUD | no answer data |
| `test_attempts` | none | safe-column SELECT own | safe-column SELECT under RLS | CRUD | no browser response/snapshot mutation |
| `user_responses` | none | none | none | CRUD | grading rows private |
| `practice_attempt_items` | none | none | none | CRUD | immutable answer/private snapshots |
| `bookmarks` | none | none direct | none direct | CRUD | current app uses authenticated service actions |
| `question_reports` | none | SELECT own | SELECT queue by role | CRUD | writes are trusted path + DB trigger |
| `user_topic_performance` | none | none direct | none direct | CRUD | analytics are server-owned |
| `study_plans` | none | none direct | none direct | CRUD | no current direct browser workflow |
| `study_tasks` | none | none direct | none direct | CRUD | no current direct browser workflow |
| `question_reviews` | none | SELECT denied by RLS; INSERT denied by role | SELECT; self INSERT; Admin DELETE | CRUD | attribution and append-only policies |
| `subscriptions` | none | SELECT own; DML denied by RLS | Admin SELECT/CRUD | CRUD | billing state is trusted-only |
| `audit_logs` | none | none | none direct | CRUD | Admin service writes only |
| `mistake_notebook_entries` | none | none direct | none direct | CRUD | current app uses owner-checked actions |
| `fidelity_audit_samples` | none | none | none direct | CRUD | Admin/Reviewer service workflow |
| `fidelity_audit_reviews` | none | none | none direct | CRUD | Admin/Reviewer service workflow |
| `admin_response_analytics` | none | none | none direct | SELECT | revoked analytical view |
| `generated_core_mocks` | none | none | none | CRUD | private generated state |
| `core_mock_generation_events` | none | none | none | CRUD | operational telemetry |
| `practice_sessions` | none | none | none | CRUD/RPC | server-owned session state |
| `practice_session_items` | none | none | none | CRUD/RPC | private generated/answer snapshots |
| `practice_events` | none | none | none | CRUD | server-owned analytics events |
| `security_rate_limits` | none | none | none | CRUD/RPC | shared security control only |

All browser table/sequence privileges are revoked before explicit grants are rebuilt. Browser function execution is also revoked globally; only the two role helpers are regranted to browser roles, while privileged RPCs are service-only. `CREATE` on `public` and future default privileges are deny-by-default for `anon` and `authenticated`.

## Verification evidence

| Command/check | Result |
| --- | --- |
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| Targeted login/Auth/security tests | PASS — 6 files, 48 tests |
| `npm test` | ASSERTIONS PASS / RUNNER UNSTABLE — 108 files and 628 active tests passed; 17 files/27 opt-in audits skipped, then Vitest emitted a worker IPC `onTaskUpdate` timeout and exited nonzero |
| `npm run build` | PASS — Next 16.3.3 production build, TypeScript, 32 static-generation units, all routes |
| Built-server header probe | PASS — HTTP 200, CSP present, nonce changes per request, no script `unsafe-inline`, `nosniff`, frame `DENY` |
| `npm audit --audit-level=low` | PASS — 0 vulnerabilities |
| Secret/client-boundary scan | PASS — only `.env.example` tracked; `.env.local` ignored; no live-format key/JWT pattern found; no browser Admin-client call site |
| pgTAP database suite | NOT RUN LOCALLY — Supabase CLI and `psql` unavailable; mandatory staging step |
| `git diff --check` | PASS (line-ending conversion notices only; no whitespace errors) |

The current full-suite run completed all 628 active assertions, but Vitest reported a worker IPC `onTaskUpdate` timeout after the frozen Mathematical Equations generator test file ran for roughly 63 seconds. Two earlier exact attempts showed the same timing-sensitive worker failure (one also timed out an unrelated Latin Square solver assertion); that solver immediately passed 7/7 in isolation. No frozen generator code, thresholds, or test settings were changed as part of this login-only fix.

## Required staging security verification

1. Apply migrations through `202608270023_fix_security_rate_limit_timestamp.sql` to the classified staging project.
2. Execute `supabase/tests/rls_security_remediation.test.sql` and retain all 33 pgTAP assertions.
3. Test the six adversarial actors: anonymous, Student A, Student B, Reviewer A, Reviewer B, and Admin.
4. Verify live Auth CAPTCHA, email confirmation, password/session controls, exact redirects, Google/phone provider settings, SMTP/SMS controls, and spend/rate alerts.
5. Configure `SECURITY_RATE_LIMIT_SECRET`; verify limiter failures/429 UX and the selected trusted IP header at the actual edge.
6. Inspect CSP and cookies in a real browser over HTTPS, including normal Supabase refresh and a blocked inline-script probe.
7. Confirm the service-role secret never appears in browser bundles, hosting logs, previews, or client environment variables.
8. Enable and require the GitHub security workflow and review the first Dependabot PR/run.

# READY FOR STAGING SECURITY VERIFICATION

This verdict is intentionally not approval for public deployment. Public release remains blocked until the migration and pgTAP suite pass on staging and every external Supabase/hosting control above has retained evidence.
