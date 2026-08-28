# PrepDMAT Repository Cleanup Audit

Audit date: 2026-08-28  
Baseline commit: `36d5e36 Optimize application performance`  
Scope: tracked repository plus ignored/generated-state policy; `.env.local` values were not read, printed, or modified.

## Guardrails

The audit treated observable behavior, authorization, deterministic generation, persisted contracts, migration history, and the post-performance architecture as frozen. In particular, it protected:

- batched database-backed security rate limiting and `202608270024_batch_security_rate_limits.sql`;
- the one-action Diagnostic save-and-continue flow;
- Practice initialization without post-create row readbacks;
- the isolated Practice timer and dynamically loaded feedback surfaces;
- parallel Mock autosave reads;
- generator, validator, critic, diversity, grading, explanation, and acceptance behavior;
- Progress architecture, which was explicitly outside cleanup scope.

No cleanup decision used modification time alone. Each removal required both a reference/reachability check and a repository-role check.

## Method

The audit used:

1. a clean Git baseline and tracked-file/byte inventory;
2. route enumeration from `src/app` and the successful Next production route build;
3. `rg` reference searches across source, tests, scripts, docs, reports, and migrations;
4. server-action, Supabase-client, generator, hook, component, utility, schema, barrel, and dependency inventories;
5. direct-versus-transitive package comparison against source imports and package scripts;
6. generated-artifact provenance checks against their audit/render scripts and retained merged evidence;
7. secret-pattern and environment-name checks that excluded `.env.local` contents;
8. TypeScript, ESLint, focused tests, the complete Vitest suite, production build, dependency audit, and whitespace validation.

## Baseline

| Metric | Before cleanup |
| --- | ---: |
| Tracked files | 854 |
| Tracked repository bytes | 18,758,195 |
| `src` files | 391 |
| `src` bytes | 2,085,243 |
| TypeScript/TSX/CSS source lines | 46,289 |
| `public` files / bytes | 5 / 3,314 |
| `reports` files / bytes | 376 / 13,951,706 |
| Supabase files / bytes | 26 / 136,203 |
| Test files / bytes | 152 / 759,482 |
| Direct runtime dependencies | 18 |
| Direct development dependencies | 10 |
| Lockfile package entries | 646 |
| Supabase migrations | 24 |
| Practice raw initial entry JavaScript | 470,783 B |

The largest tracked items were the official dMAT PDF evidence, generator/mock audit JSON, generated mock shards, generated visual SVG inputs, contact sheets, and the lockfile. The official PDF, merged audit results, human-review reports, and contact sheets were classified separately from regenerable intermediates.

## A–K classification

| Class | Classification | Evidence and decision |
| --- | --- | --- |
| A | Product-critical runtime | App routes, Server Actions with callers, auth, Practice, Mock, Diagnostic, grading, explanations, analytics, generators, validators, and security primitives. Retained. |
| B | Shared infrastructure | Next configuration, environment validation, navigation constants, protocol/evidence types, active barrels, theme tokens, and shared UI. Retained, except proven unreachable leaves. |
| C | Admin-only runtime | Admin routes, authoring/review/generation/publishing actions and data paths. Retained. One unreachable legacy lifecycle action and its private data/schema chain were removed. |
| D | Student-only runtime | Onboarding, Practice, Mock, Results, Dashboard, Progress, bookmarks, mistakes, and account flows. Retained. Three obsolete two-action Diagnostic wrappers were removed; the active atomic continuation path was retained. |
| E | Durable audit evidence | Official evidence, merged audit JSON/Markdown, taxonomy/difficulty reports, contact sheets, security/performance/removal reports, and manual-review conclusions. Retained. |
| F | Regenerable outputs | Per-item visual SVGs, visual index HTML, and mock audit shards whose merged evidence is retained and whose scripts regenerate them. Removed and ignored. |
| G | Historical compatibility | Removed-module enum/database history, compatibility tests, historical migrations, future entitlement fields, and dated audits. Retained because they protect persisted/history contracts or document prior decisions. |
| H | Proven dead source | Unreferenced marketing prototypes, UI wrappers, theme hook, fidelity persistence layer, generic generation-validation wrapper, old action wrappers, and dead CSS selectors. Removed. |
| I | Proven dead direct dependency | `@hookform/resolvers`, `react-hook-form`, `recharts`, and unused `@vitest/coverage-v8`. Removed. `sharp` was made explicit for retained rendering scripts. |
| J | Local/generated state | `.next`, coverage, test results, browser reports, logs, caches, temp files, local env files, and regenerable audit intermediates. Ignored; local secrets were not inspected. |
| K | Ambiguous or externally callable | Authenticated `/api/progress`, manual audit/render scripts, evidence barrels reached via relative imports, `.trae` planning documents, and compatibility types. Retained rather than guessing. |

## Runtime reachability findings

### Routes

The successful production build enumerated 34 app endpoints plus the global not-found route and Proxy. All file-system routes were valid. `/onboarding/diagnostic` and `/onboarding/diagnostic/summary` are implemented and active. `/pricing` is intentionally not a page; `next.config.ts` redirects it to `/`.

No abandoned route directory or invalid typed navigation target was found. The authenticated `/api/progress` route has no in-repository UI caller, but is a legitimate external API boundary and was retained under Class K.

### Server Actions and data functions

Every active Server Action has a UI, route, form, test, or server workflow caller except the removed `questionLifecycleAction`. That action's private `updateQuestionLifecycle` function and `questionLifecycleSchema` had no other consumer, so the entire unreachable chain was removed together.

The old Diagnostic exports `saveDiagnosticAnswer`, `advanceDiagnosticQuestion`, and `completeInitialDiagnostic` belonged to the former two-primary-action interaction. No caller remained after the atomic `continueInitialDiagnostic` implementation. Their removal does not change the active save-before-advance, retry, locking, or completion behavior.

The old generated-fingerprint query and three type-specific wrappers had been superseded by the bounded novelty-history functions and had no callers. They were removed without changing generator or publication behavior.

Four Progress convenience wrappers had no callers. Only the wrappers and their now-unused imports were removed; observation loading, `getCoreProgress`, models, skills, recommendations, and all Progress screens remain unchanged.

### Components, hooks, utilities, and barrels

The following files had no import, route, dynamic-load, script, test, or barrel consumer and were removed:

- `src/components/marketing/exam-overview.tsx`
- `src/components/marketing/feature-grid.tsx`
- `src/components/marketing/hero-section.tsx`
- `src/components/theme/theme-menu.tsx`
- `src/components/ui/separator.tsx`
- `src/components/ui/tooltip.tsx`
- `src/hooks/use-resolved-theme.ts`
- `src/lib/fidelity/data.ts`
- `src/lib/fidelity/index.ts`
- `src/lib/generation/validation.ts`

The generation barrel was updated only to stop exporting the deleted generic validation wrapper. The active module-specific validators are unchanged. The evidence barrel was retained because relative directory imports reach it even though alias-only searches do not.

### Supabase clients and server boundaries

All four clients have distinct active roles and were retained:

- browser client for public-session browser operations;
- cookie-aware server client for request-scoped authenticated reads;
- Proxy client for session refresh;
- service-role Admin client for privileged, server-only operations.

`server-only` imports and private/public snapshot separation remain intact. No client bundle was given service-role, answer-key, private snapshot, or rate-limit secret access.

### CS, AI providers, pricing, and auth experiments

- No live CS product implementation remains. CS references are restricted to historical migrations/generated database types, the dated removal report, and tests asserting its absence. Those compatibility/history records were retained.
- No runtime OpenAI, OpenRouter, NVIDIA, Gemini, or other AI provider client, key access, package, or route exists. Provider names occur only in reports/docs/regression checks. No AI cleanup was necessary.
- No student pricing UI is live. `/pricing` remains a redirect. Subscription/entitlement schema and server checks are retained for future monetization; launch-stage tests keep pricing/paywall copy out of student surfaces.
- No cross-device verification experiment, temporary auth-token storage, or abandoned auth helper was found. The only `localStorage` use is for workspace/sidebar preferences.

## Dependency findings

Removed direct packages:

- `@hookform/resolvers`: no application or test import;
- `react-hook-form`: no application or test import;
- `recharts`: no import; only dead `.recharts-*` CSS remained and was removed;
- `@vitest/coverage-v8`: no coverage command or Vitest configuration consumed it.

Retained packages all have a source/config/tooling consumer. `@types/*` packages are compiler-discovered. `server-only` is an intentional boundary marker. `sharp` is now an explicit dev dependency because three retained contact-sheet scripts import it; previously they relied on Next's transitive dependency.

The clean install reduced lockfile package entries from 646 to 555 and the lockfile from 337,053 to 294,176 bytes. The installed clean tree contains 426 dependency packages plus the root package.

## Generated artifacts and ignore policy

Removed 276 regenerable report intermediates:

- 8 Core Mock shard JSON files; merged release-audit artifacts remain;
- 180 production-gate per-item SVGs; contact sheets and final/manual review evidence remain;
- 10 Figure Sequence per-item SVGs;
- 30 Latin Square per-item SVGs;
- 45 Mathematical Equation per-item SVGs;
- 3 generated `visual-samples.html` indexes.

Also removed the 5 unreferenced default Next starter SVGs from `public`. No product asset, official evidence PDF, contact sheet, final report, migration, or test fixture was deleted.

`.gitignore` now covers browser/test reports, generic cache/temp files, and the exact regenerable report paths above. It continues to ignore `.env*` while allowing `.env.example`.

## Environment and secret audit

All environment names in `env-schema.ts` map to active code or a deliberate deployment option. `.env.example` now documents the previously omitted Supabase URL, anon key, and service-role key with safe placeholders. No secret value was copied.

A filename-only secret-pattern scan outside ignored env/build/dependency directories found no private keys or token-shaped credentials. Local environment values were deliberately not opened. Server-only names remain absent from client code.

## Retained by design

- all 24 ordered migrations, including the unchanged batched limiter migration;
- official dMAT evidence and all durable generator/manual-review conclusions;
- generator implementations, validators, taxonomies, fixtures, stress/audit tests, and publication gates;
- Progress architecture and its supported public surface;
- entitlement/subscription storage and access architecture for future use;
- compatibility enums/types required by historical persisted data;
- manual/staging/audit scripts that are not ordinary import-graph entry points;
- current architecture/policy docs and clearly dated historical reports;
- `CLAUDE.md` as a useful instruction pointer to `AGENTS.md`.

## Risks and conservative decisions

Static analysis cannot prove whether an authenticated external consumer calls `/api/progress`, so it was retained. Manual rendering and staging scripts are invoked from operator workflows rather than application imports, so they were retained. No migration was squashed or rewritten. No dependency was upgraded merely to eliminate a local engine warning.

The local runtime is Node 20.16.0; `eslint-visitor-keys@5.0.1` declares Node `^20.19.0 || ^22.13.0 || >=24`. Verification still passes locally, but deployment/CI should use a supported Node release rather than altering pinned application behavior during cleanup.
