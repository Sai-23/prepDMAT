# PrepDMAT Repository Cleanup Report

Cleanup date: 2026-08-28  
Baseline: `36d5e36 Optimize application performance`

## Executive summary

The repository was reduced without changing the student product, Admin workflows, security policy, persisted contracts, generator behavior, or the prior performance architecture. Cleanup removed unreachable source, unused direct packages, default starter assets, and regenerable audit intermediates while retaining durable evidence, compatibility history, and future-facing subscription schema.

The clean install, lint, TypeScript, 657-test regression suite, production build, dependency audit, and whitespace gate all pass. Practice's raw initial entry JavaScript is lower than the protected post-performance baseline.

## Repository metrics

| Metric | Before | After | Change |
| --- | ---: | ---: | ---: |
| Repository files | 854 | 565 | -289 |
| Repository bytes | 18,758,195 | 13,394,766 | -5,363,429 (-28.6%) |
| `src` files | 391 | 381 | -10 |
| `src` bytes | 2,085,243 | 2,066,626 | -18,617 (-0.9%) |
| TypeScript/TSX/CSS source lines | 46,289 | 45,801 | -488 |
| `public` files / bytes | 5 / 3,314 | 0 / 0 | -5 / -3,314 |
| `reports` files / bytes | 376 / 13,951,706 | 102 / 8,656,793 | -274 / -5,294,913 |
| Supabase files / bytes | 26 / 136,203 | 26 / 136,203 | unchanged |
| Test files / bytes | 152 / 759,482 | 152 / 759,436 | 0 / -46 |
| Direct dependencies | 28 | 25 | -3 |
| Lockfile package entries | 646 | 555 | -91 |
| Lockfile bytes | 337,053 | 294,176 | -42,877 |
| Migrations | 24 | 24 | unchanged |
| Practice raw initial JS | 470,783 B | 463,048 B | -7,735 B (-1.6%) |

These measurements exclude `node_modules`, `.next`, local environment files, and other ignored state. The cleanup deletes 291 files and adds these two cleanup reports, for a net reduction of 289 files. Git records 535 deleted source lines and three added source/test lines; the consistent whole-source measurement decreases by 488 because diff and line-count tools treat final/blank lines differently.

## Files removed

| Path/group | Classification | Evidence it was unused or regenerable |
| --- | --- | --- |
| `src/components/marketing/exam-overview.tsx` | H — dead source | No import, route, test, dynamic-load, or barrel consumer; superseded by the current inline landing page. |
| `src/components/marketing/feature-grid.tsx` | H — dead source | No consumer; old landing prototype only. |
| `src/components/marketing/hero-section.tsx` | H — dead source | No runtime consumer; one static test file-list reference was removed with it. |
| `src/components/theme/theme-menu.tsx` | H — dead source | Unused wrapper around the active Theme Toggle. |
| `src/components/ui/separator.tsx` | H — dead source | Zero consumers. |
| `src/components/ui/tooltip.tsx` | H — dead source | Zero consumers. |
| `src/hooks/use-resolved-theme.ts` | H — dead source | Zero consumers; current theme code uses `next-themes` directly. |
| `src/lib/fidelity/data.ts` | H — dead source | Both persistence exports had zero callers. |
| `src/lib/fidelity/index.ts` | H — dead barrel | No imports; only re-exported the unused fidelity persistence layer. |
| `src/lib/generation/validation.ts` | H — dead source | Generic validation exports had zero callers; module-specific validators remain active. |
| `public/file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg` | F — starter assets | No source, style, metadata, route, or test reference. |
| `reports/core-mocks/shards/*.json` | F — generated output | Four build shards; merged `release-audit.json`/`.md` retained. |
| `reports/core-mocks/cross-session/shards/*.json` | F — generated output | Four cross-session shards; durable merged evidence retained. |
| `reports/generator-production-gate/visual-*.svg` | F — generated output | 180 per-item render inputs reproducible by audit scripts; contact sheets and final/manual review retained. |
| `reports/figure-sequences/visual-*.svg` | F — generated output | 10 per-item render inputs; retained PNG review evidence covers the outputs. |
| `reports/latin-squares/visual-*.svg` | F — generated output | 30 per-item render inputs; retained contact sheets cover the outputs. |
| `reports/mathematical-equations/visual-*.svg` | F — generated output | 45 per-item render inputs; retained contact sheets and manual review cover the outputs. |
| Three `reports/*/visual-samples.html` files | F — generated output | Indexes referenced only the deleted regenerable SVG inputs. |

In total: 10 source files, 5 public starter assets, and 276 report intermediates were deleted. No test, fixture, contact sheet, official evidence file, final audit report, or migration was deleted.

## Code removed

| Feature/module | Old purpose | Why obsolete |
| --- | --- | --- |
| Diagnostic wrappers | Separate save, advance, and completion entry points | The shipped UX uses `continueInitialDiagnostic`, which atomically saves then advances/completes. The wrappers had no callers. |
| Admin lifecycle action chain | Generic submit/publish/retire mutation | No UI or server caller remained; current authoring/review/publishing workflows use dedicated validated actions. |
| Generated fingerprint wrappers | Query all generated fingerprints per question type | Superseded by bounded novelty-history loaders that include fingerprints and structural profiles. |
| Progress convenience wrappers | Individual module/skill/weak-area/recommendation accessors | No caller; supported Progress consumers use `getCoreProgress`. Core computation and UI are unchanged. |
| Fidelity persistence layer | Generic sample/review storage helpers | Never integrated; the active sampler/audit workflow writes explicit artifacts. |
| Generic generation validation wrapper | Shared validation result/assertion helper | Never consumed; each protected generator has its own active validator. |
| Recharts CSS selectors | Style hooks for an earlier chart package | No Recharts component or import exists. Shared non-Recharts chart tooltip styling remains. |

## Post-performance remnants removed

| Area | Removal | Protected implementation retained |
| --- | --- | --- |
| Rate limiter | None; no obsolete limiter path was found | Batched database RPC consumption, security hashing, and migration `202608270024` remain unchanged. |
| Diagnostic | Three obsolete two-action data wrappers | Atomic save-and-continue, save-before-advance, retry recovery, locking, and final completion remain unchanged. |
| Practice | No performance implementation removed | No-readback initialization, overlapped context/history work, isolated timer, and dynamic feedback imports remain. |
| Mock | No performance implementation removed | Parallel autosave validation/read phases, immutable snapshots, and grading remain. |

## Dependencies removed

| Package | Why unused | Runtime/build impact |
| --- | --- | --- |
| `@hookform/resolvers` | No source, test, script, or config import | None; forms use native/server-action validation. |
| `react-hook-form` | No source, test, script, or config import | None. |
| `recharts` | No component import; only dead CSS selectors existed | None; existing UI does not render Recharts. |
| `@vitest/coverage-v8` | No coverage script or Vitest configuration consumes it | None; ordinary and focused tests are unchanged. |

`sharp` was added as an explicit dev dependency because three retained contact-sheet scripts import it. It was already installed transitively through Next, so this corrects dependency ownership without increasing the clean installed package count.

The direct package total fell from 28 to 25. Lockfile entries fell from 646 to 555, and a clean install produced 426 dependency packages plus the root package.

## Assets removed

| Asset | Previous purpose | Evidence unused |
| --- | --- | --- |
| Five default Next SVGs | Starter-template decoration | No reference anywhere in runtime source or metadata. |
| Per-item audit SVGs | Temporary visual rendering inputs | Regenerated by retained scripts; summarized by retained contact sheets/manual reports. |
| Visual HTML indexes | Local browsing of per-item SVGs | Only linked removed intermediates; no durable conclusion depended on them. |
| Mock shard JSON | Parallel audit assembly intermediates | Retained merged release audits contain the durable result. |

## Environment cleanup

No environment variable was removed. `.env.example` now safely documents all required base names:

- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED`
- `NEXT_PUBLIC_PHONE_AUTH_ENABLED`
- `SECURITY_RATE_LIMIT_SECRET`
- `TRUSTED_CLIENT_IP_HEADER`
- `FREE_LAUNCH_ACCESS_ENABLED`
- `ENABLE_ON_DEMAND_CORE_MOCKS`
- `CORE_MOCK_HISTORY_WINDOW`
- `CORE_MOCK_GENERATION_COOLDOWN_SECONDS`

Only safe placeholders were added. `.env.local` was not read, printed, modified, or committed. `.gitignore` still excludes `.env*` except `.env.example`.

## Dead features

- **Computer Science:** no live implementation remains. Historical database/type compatibility, the dated removal report, and absence regression tests were retained.
- **Pricing:** no student pricing page/UI is live. `/pricing` still redirects to `/`. Future subscription/entitlement storage and server checks were retained.
- **AI providers:** no runtime provider package, key access, request path, or fallback implementation exists. Provider names appear only in historical evidence and regression checks.
- **Auth experiments:** no abandoned cross-device verification flow or auth-token browser storage was found. Current verification/session architecture was retained.

No major dead system remained to delete beyond the isolated unreachable files and wrappers listed above.

## Compatibility retained

- historical enum/database types used by persisted migration history;
- future monetization entitlement/subscription structures;
- `/pricing` redirect compatibility for old links;
- authenticated `/api/progress`, conservatively treated as an external API boundary;
- relative-imported evidence barrels and manual operator scripts;
- `.trae` product/architecture planning documents;
- `CLAUDE.md` as a concise pointer to repository instructions;
- dated audits and removal reports, clearly distinguishable from current architecture docs.

## Database history retained

All 24 ordered Supabase migrations remain. No migration was edited, deleted, squashed, or reordered. `supabase/migrations/202608270024_batch_security_rate_limits.sql` is byte-for-byte unchanged in the cleanup diff.

## Security retained

- RLS policies, grants, rate-limit thresholds/scopes, ownership checks, and service-role operations are unchanged.
- Browser, request-server, Proxy, and Admin Supabase clients remain separate by privilege and execution context.
- `server-only` boundaries remain in place.
- Private question snapshots, correct answers, grading material, and privileged keys remain server-side.
- No secret value was opened or copied; a repository secret-pattern filename scan found no token/private-key material outside excluded local state.
- The dependency audit reports zero vulnerabilities.

Security impact: neutral. The cleanup reduces unused attack surface and dependencies without weakening any control.

## Performance retained

| Item | Protected baseline | After cleanup |
| --- | --- | --- |
| Practice initial raw JS | 470,783 B | 463,048 B |
| Rate limiter | One batched database consumption | Unchanged |
| Diagnostic | One save-and-continue action | Unchanged |
| Practice initialization | No post-create readbacks | Unchanged |
| Practice render | Isolated one-second timer; dynamic feedback | Unchanged |
| Mock autosave | Independent reads run in parallel | Unchanged |

Practice is 7,735 bytes (1.6%) below the protected baseline. No compressed-size or Web Vitals claim is made.

## Test changes

| Measure | Before | After |
| --- | ---: | ---: |
| Test files | 152 | 152 |
| Passing test files | 118 | 118 |
| Intentionally skipped test files | 17 | 17 |
| Passing tests | 657 | 657 |
| Intentionally skipped tests | 27 | 27 |

No test was deleted or skipped. The student monetization contract stopped reading the deleted, unreachable Hero prototype. One unused callback parameter was renamed `_index`; assertions and coverage are unchanged. Focused Diagnostic/Admin/Progress/monetization/results verification passed 45 tests before the complete suite.

## Build comparison

The pre-cleanup baseline built successfully. The post-cleanup Next 16.3.3 production build also compiled, passed its integrated TypeScript stage, collected page data, generated 32 static pages, and validated the same live route surface. `/onboarding/diagnostic` and its summary remain. `/pricing` remains redirect-only and does not appear as a page route.

Final gates:

- `npm run lint`: passed
- `npm run typecheck`: passed
- `npm test`: 657 passed, 27 intentionally skipped
- `npm run build`: passed
- `npm audit --audit-level=high`: passed, 0 vulnerabilities
- `git diff --check`: passed
- clean `npm ci`: passed

## Remaining technical debt

- The local runtime is Node 20.16.0, while `eslint-visitor-keys@5.0.1` declares Node `^20.19.0 || ^22.13.0 || >=24`; CI and deployment should use a supported Node release. This is an environment-version warning, not a failing repository gate.
- Authenticated browser timing, Web Vitals, and production database query plans still require staging/production observability; no synthetic values were invented.
- Progress-query optimization remains explicitly out of cleanup scope and is documented in the prior performance report.

These items do not indicate remaining proven dead code or a cleanup regression.

## Final verdict

CLEAN AND PRODUCTION-READY
