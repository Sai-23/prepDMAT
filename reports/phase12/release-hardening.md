# Phase 12 release-hardening report

Audit date: 2026-08-25 (Asia/Calcutta)

## Executive result

**FINAL VERDICT: NOT READY**

The configured remote Supabase target is not identified as staging or production and is missing migration `202608220019_initial_core_diagnostic.sql`. Its diagnostic profile/session columns are absent and `public.create_initial_core_diagnostic` returns `PGRST202`. The deployed onboarding implementation therefore cannot operate against that schema.

Real-browser and authenticated multi-user verification could not be completed because no browser was available to the in-app browser controller and no controlled staging identities were provided. These are evidence gaps; they are not represented as passing checks.

Two application findings were fixed locally: onboarding is now protected by the proxy before rendering, and a keyboard-accessible mobile navigation path now exposes the core student destinations. Baseline response security headers were also added.

## 1. Migration status

| Order | Migration | Purpose | Dependency | Audit result |
| --- | --- | --- | --- | --- |
| 1 | `202608220016_core_mock_release.sql` | Adds immutable Core-mock attempt metadata and the service-only transactional creation RPC. | Existing attempts, sections, responses, and question tables. | Static audit clean; live columns/RPC observed. |
| 2 | `202608220017_on_demand_core_mocks.sql` | Adds generated-mock state, telemetry, stable question keys, ownership/atomic persistence RPCs, and replaces the curated-compatible mock RPC. | 016 and the existing `set_updated_at` function. | Static audit clean; live tables/columns/RPCs observed. |
| 3 | `202608220018_practice_sessions.sql` | Adds native practice sessions/items/events, report linkage, constraints, and service-only lifecycle RPCs. | Existing question/report/profile objects and `set_updated_at`. | Static audit clean; live tables/columns/RPC observed. |
| 4 | `202608220019_initial_core_diagnostic.sql` | Extends profiles and practice sessions for a 15-question mixed diagnostic and adds create/complete RPCs. | 018 practice tables/functions. | **Not present on configured remote.** |

Conflict review found no unintended duplicate enum/index/trigger/function definitions. Enums and indexes use guarded creation. Triggers are dropped before replacement. Migration 017 intentionally replaces 016's `create_core_mock_attempt`. Migration 019 intentionally replaces the practice source/count constraint introduced by 018 after adding `session_type` and permitting a null module only for diagnostic sessions.

No migrations were applied. The remote was classified as `remote-unclassified`, the Supabase CLI was unavailable locally, and blindly mutating that target would be unsafe.

### Staging deployment checklist

Use a separately identified staging project and the official Supabase migration workflow:

```text
supabase login
supabase link --project-ref <STAGING_PROJECT_REF>
supabase projects list
supabase migration list --linked
supabase db push --dry-run
supabase db push
supabase migration list --linked
node scripts/run-phase12-live-schema-audit.mjs
```

Before `db push`, confirm the linked project ID and inspect the dry-run output. Do not use `supabase db reset --linked`; it is destructive. Supabase documents `db push` as applying only pending migrations and `migration list` as comparing local and remote history: <https://supabase.com/docs/guides/deployment/managing-environments>.

After migration, require all schema checks and all RPC existence checks in the audit script to pass, then run the authenticated staging matrix before release.

## 2. Schema and RLS verification

Read-only live probes confirmed migration 016–018 objects used by attempts, generated mocks, telemetry, practice sessions/items/events, responses, and reports. Migration 019 profile fields, `practice_sessions.session_type`, and `create_initial_core_diagnostic` were not found.

Anonymous requests to `generated_core_mocks`, `core_mock_generation_events`, `practice_sessions`, `practice_session_items`, and `practice_events` were denied with `42501`. Existing service-only RPC probes reached deliberate input-validation errors (`P0001`); anonymous execution was denied with `42501`.

This proves anonymous isolation for the probed objects. It does **not** prove student A versus student B ownership, reviewer/admin behavior, catalog-level index/policy/trigger state, or answer-field isolation under a real authenticated token. Those tests remain required after staging is identified and migrated.

## 3. Browser environments tested

No interactive browser environment was available. The browser controller reported no available browser, and its required troubleshooting check returned an empty browser list. Chromium, Firefox, and WebKit/Safari were therefore not tested. No substitute browser automation was used.

A local optimized Next.js server was exercised through HTTP only. This verifies response codes, redirects, headers, and server response timing—not rendering, hydration, focus, console, layout, or visual behavior.

## 4. Authentication results

Unauthenticated production-server requests to Dashboard, Practice, Progress, Results, Onboarding, Diagnostic, and Diagnostic Summary return `307` to `/login?next=...`. The onboarding fix changed its previous `200` streamed component redirect into proxy-level protection. The public home and login routes return `200`; an unknown route returns `404`. No redirect loop was observed in HTTP-level checks.

Sign-in, sign-out, token refresh, expired sessions, returning-user routing, and role-specific browser behavior remain unverified.

## 5. Onboarding and diagnostic results

Routes and production compilation exist, and automated source contracts pass as part of the full suite. Pre-completion diagnostic data uses public snapshots; private answers are read only by server-only data code for eligible completion/summary paths.

The complete flow is blocked on the configured remote by missing migration 019. New-user, skip, 15-answer, refresh/resume, summary, dashboard handoff, and returning-login scenarios were not browser-tested.

## 6. Practice results

Automated contracts cover native snapshot separation, answer locking, expiration rejection, session architecture, all generators, targeted generation, feedback, explanations, review, and analytics integration. The focused set passed 29/29 tests; these tests are also included in the full suite.

The complete module/difficulty/count/timing matrix and refresh/resume behavior were not exercised in a real browser or against authenticated staging data.

## 7. Mock results

Curated/generated assembly, immutable snapshots, atomic generated persistence, ownership orchestration, simultaneous-request handling, failure recording, analysis, and review contracts pass in the full suite. The on-demand feature defaults off because `ENABLE_ON_DEMAND_CORE_MOCKS` is unset in the configured environment.

Curated and generated browser flows were not run. Generated mock persistence RPCs exist on the remote, but no real mock was generated because the target was not confirmed as staging.

## 8. Timer and transition results

Static and automated checks confirm server-stored practice expiry, server-side answer rejection after expiry, server-derived mock section boundaries, auto-submit logic, and immutable response persistence contracts. Client clock manipulation, refresh, tab close/reopen, network interruption, and live section-boundary persistence were not browser-tested.

Timed practice still rejects answers at expiry and requires explicit exit. Without browser evidence, its usability is not classified as a defect and was not redesigned.

## 9. Results and review results

Result/review and mock-analysis tests pass, including sparse/rich metadata handling, response status filters, difficulty/skill/timing calculations, and immutable snapshots. Live all-answered, unanswered, auto-submit, and duration variants were not exercised.

## 10. Progress results

The deterministic 1,000-history analytics audit passes. Model tests cover insufficient data, early/reliable confidence, module weaknesses, trends, recommendations, and no fabricated zero score. Authenticated live rendering remains unverified.

## 11. Dashboard results

Dashboard model, data, UI, and synthetic audit contracts pass, including resume priority, feature-disabled behavior, fallback behavior, and partial analytics failure. Authenticated live rendering remains unverified.

## 12–16. Responsive and visual findings

Static review found that desktop navigation was hidden below `lg` with no mobile alternative. This was fixed with a native-dialog mobile menu containing Dashboard, Practice, Tests, Progress, Results, and the existing student destinations. Active items expose `aria-current`, links have visible focus styles, and mobile rows have a minimum 44 px height. Header content was compacted below `sm` to reduce 320 px collision risk.

No real viewport was available, so 320/375/430/768/1024/1440 rendering is unverified. Figure clipping/distinguishability, Latin 5×5 sizing, equation wrapping/input behavior, and light/dark visual contrast cannot be signed off. Existing renderers expose responsive sizing, overflow containment where appropriate, semantic labels, and token-based light/dark colors, but this is static evidence only.

## 17. Accessibility findings

No automated accessibility dependency exists, and none was installed. Static checks found semantic navigation labels, current-page state, native dialog behavior, focus rings, labeled question controls, pressed/selected states, status/live regions, and reduced-motion handling in loading UI. The mobile navigation contract test passes.

Keyboard traversal, focus trapping/restoration, screen-reader output, heading/landmark order in rendered pages, timer announcements, contrast, and form-error behavior were not practically verified because no browser was available.

## 18. Mobile navigation findings

The missing mobile navigation path was fixed. Onboarding is intentionally not globally listed because it is state-dependent; its flow redirects and Dashboard recommendations determine when it is relevant. Real tap/scroll/obscuration testing remains outstanding.

## 19. Error and loading findings

Global and Dashboard error boundaries provide safe retry UI without rendering database details. Loading components exist globally and for Dashboard, Practice, Practice Review, Tests, Results, Progress, and Onboarding (inherited by diagnostic routes). Server actions return controlled messages and generated-mock failures are recorded without partial attempts.

Actual database outages, expired sessions, thrown server exceptions, and slow-loading rendering were not interactively simulated. The known test stderr contains intentionally logged generated-mock failure metadata only; it contains no provider output or secrets.

## 20. Network and idempotency findings

Automated generated-mock tests pass for same-user contention, different-user concurrency, transactional failure, and non-partial persistence. Practice contracts reject duplicate answers. Refresh-during-save, dropped connections, duplicate clicks in UI, and retry affordances were not browser-tested.

## 21. Cross-browser findings

Not tested. No browser was available, so cross-browser support is not claimed.

## 22. Real database latency

Seven read-only service-role HEAD samples per available area, with no row contents returned:

| Probe area | Samples | P50 | P95 | Max |
| --- | ---: | ---: | ---: | ---: |
| Dashboard/progress base attempt state | 7 | 35.4 ms | 47.2 ms | 47.2 ms |
| Practice session item load | 7 | 39.4 ms | 293.2 ms | 293.2 ms |
| Mock attempt item/results load | 7 | 42.6 ms | 82.5 ms | 82.5 ms |
| On-demand mock state | 7 | 41.0 ms | 79.4 ms | 79.4 ms |
| Diagnostic state | 1 failed probe | 35.2 ms | 35.2 ms | 35.2 ms |

These are limited table round trips, not authenticated end-to-end product query timings. Practice answer submission and composed Dashboard/Progress/Results query latency remain unmeasured. The diagnostic probe failed because `session_type` is absent.

## 23. Page performance

Seven local production HTTP samples:

| Route | Result | P50 | P95/max |
| --- | --- | ---: | ---: |
| `/` | 200 | 27.7 ms | 411.6 ms cold/outlier |
| `/login` | 200 | 22.8 ms | 50.1 ms |
| `/dashboard` | 307 | 4.8 ms | 7.9 ms |
| `/practice` | 307 | 4.2 ms | 8.4 ms |
| `/progress` | 307 | 2.9 ms | 4.3 ms |
| `/results` | 307 | 4.1 ms | 8.8 ms |
| `/onboarding` | 307 | 3.6 ms | 4.3 ms |
| `/onboarding/diagnostic` | 307 | 2.7 ms | 4.7 ms |
| `/onboarding/diagnostic/summary` | 307 | 3.0 ms | 3.6 ms |
| unknown route | 404 | 11.4 ms | 22.7 ms |

Protected route values measure proxy redirects, not authenticated data/render work. Browser render time, large-history performance, layout shift, and route bundle cost remain unmeasured. The production build reports 32 generated pages and no unusually large bundle information.

## 24. Console and hydration findings

Not tested in a browser. The optimized build completed without hydration diagnostics. The test runner emitted only a Vite CJS deprecation notice and expected safe generated-mock failure logs.

## 25. Legacy-data behavior

Automated tests pass for immutable historical snapshots, curated sparse metadata, analytics fallbacks, and old-answer preservation. Live legacy rows were not opened in a browser.

## 26. Security and answer leakage

Added `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, one-year HSTS, and disabled `X-Powered-By`. Dynamic responses are `private`, `no-store`, and `no-cache`. A CSP was not added without browser validation because an incorrect policy could break Next.js script execution.

Server-only imports protect data loaders. Public practice/mock/diagnostic snapshots exclude correct answers and explanation traces; private snapshots remain in server-only persistence/data layers and are exposed only after eligible feedback/results. Automated leakage contracts pass. No authenticated network-payload inspection was possible.

## 27. End-to-end flow results

Flows A–D were not completed. They require an identified, migrated staging database, controlled user identities, and an available browser. HTTP route protection and automated component/data contracts are supporting evidence, not substitutes for these flows.

## 28. Files modified by Phase 12

- `next.config.ts`
- `src/proxy.ts`
- `src/components/layout/site-header.tsx`
- `src/components/layout/site-header-navigation.tsx`
- `src/components/layout/site-header-navigation.test.tsx`
- `scripts/run-phase12-live-schema-audit.mjs`
- `reports/phase12/release-hardening.md`

No generator algorithm was modified.

## 29. Migrations applied

None.

## 30. Tests run

- `npm run lint`: pass.
- `npm run typecheck`: pass.
- Focused practice/mock/dashboard/mobile-navigation tests: pass (30 tests across the focused runs).
- `npm test -- --maxWorkers=1 --minWorkers=1`: pass, 89 files and 469 tests passed; 15 audit files/23 tests skipped by their existing opt-in design.
- `npm run build`: pass (Next.js 16.3.0 optimized production build).
- Local production HTTP route/header/performance smoke: pass for the tested unauthenticated cases.
- Read-only remote schema/RLS/RPC/latency probe: completed; exposed the migration blocker.
- Browser/E2E and automated accessibility: unavailable.
- `git diff --check`: recorded after final verification.

## 31. Release blockers

### BLOCKER

- Migration 019 is absent from the configured remote database. Diagnostic profile/session reads and creation RPCs cannot work.

### HIGH evidence gaps

- No real authenticated student A/student B/admin RLS matrix.
- No real-browser authentication, end-to-end, timer, responsive, visual, accessibility, network, console, or browser-matrix verification.

### Resolved locally

- Onboarding route family bypassed proxy-level authentication.
- Mobile global navigation did not exist.
- Baseline application security headers were absent and `X-Powered-By` was exposed.

## 32. Remaining medium/low issues

- **Medium:** Timed-practice expiry requires explicit exit; usability needs browser validation before changing it.
- **Medium:** No diagnostic-specific feature flag exists. Safe rollback is an application/database deployment decision, not a runtime toggle.
- **Medium:** CSP remains deferred pending a deployment-specific nonce/hash design and browser validation.
- **Low:** Vitest reports Vite's CJS Node API deprecation warning.

### Safe-disable/rollback notes

- On-demand mock generation can be disabled with `ENABLE_ON_DEMAND_CORE_MOCKS=false`; existing attempts remain reviewable.
- Recent schemas are additive or intentionally constraint-replacing. Prefer rolling back application entry points while retaining data, then ship a forward corrective migration. Do not down-migrate or remotely reset a database containing user attempts.
- Practice and diagnostic have no independent runtime flags. Before production, define and rehearse an application rollback that preserves practice/diagnostic rows; do not drop their tables or private snapshots.

## 33. Final verdict

**NOT READY**

Exit criteria: identify and link a staging project, apply and verify migration 019, run the authenticated multi-role RLS matrix, then complete the requested browser/E2E, viewport, accessibility, timer, network, and console checks. Only after those checks pass should the verdict be reconsidered as `READY FOR CONTROLLED STAGING`.
