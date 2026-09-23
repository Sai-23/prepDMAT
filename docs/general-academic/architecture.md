# General Academic Module foundation

Phase 1 models General Academic content as a versioned **Source Pack**: one academic stimulus and its structured representations, followed by linked single-choice questions. It adds no student route, attempt, mock, generation, review, approval, or publication UI.

## Canonical contract

Every pathway must produce `CanonicalGeneralAcademicPack`, validated by the Zod source of truth in `src/lib/general-academic/schemas.ts`:

`manual editor / JSON / external AI / managed AI gateway / parameterized / deterministic → canonical pack → validator → draft`

The only supported interchange version is `general-academic-pack@1`. The committed JSON Schema is generated with `npm run export:gam-schema`; a drift test keeps it synchronized with Zod.

Unknown object fields are rejected. The importer trims strings, collapses inline whitespace, preserves useful stimulus paragraphs, uppercases and orders option IDs, lowercases and deduplicates tags, safely sorts uniquely ordered questions, and always replaces imported review status with `draft`.

## Registries

- Domains: `mathematics`, `computational_sciences`, `natural_sciences`, `engineering`, `business_administration`, `economics`, `social_sciences`, `humanities`.
- Difficulties: `easy`, `medium`, `hard`, independently assigned to the pack and each question.
- Origins: `manual`, `json_import`, `external_ai`, `openai`, `parameterized`, `deterministic`.
- Skills are defined once in `src/lib/general-academic/registries.ts`; identifiers are stored, while display labels remain separate.
- Lifecycle: `draft`, `needs_review`, `approved`, `published`, `rejected`, `archived`. Import and persistence primitives in this phase always write `draft`.

Origin is provenance, not publication authority. `sourceMeta` may record provider, model, generation time, external reference, and generation ID; it must not contain credentials.

## Stimulus representations

- `text`: required plain academic text, up to 100,000 characters.
- `formulas`: pack-local ID, optional label, expression, and variable metadata.
- `tables`: primitive cells with application validation that every row matches the column count.
- `graphs`: `line`, `bar`, or `scatter`, with axes and finite numeric points.
- `figures`: non-executable `diagram` descriptors backed by bounded JSON values.

Arbitrary HTML, scripts, script URLs, event handlers, executable SVG, iframes, prototype keys, oversized figure data, and excessive nesting are rejected. Phase 1 renders none of this content.

## Questions and validation

Each question has a pack-local ID, unique positive order, registered skill, independent difficulty, prompt, exactly four unique `A/B/C/D` options, one matching correct option, and a structured explanation (`summary`, one or more `steps`, `takeaway`). Optional deterministic metadata supports numeric, categorical, boolean, text, and manual answer types without claiming that every question is machine-solvable.

Validation returns structured errors and warnings with stable codes, readable paths, messages, and `error|warning` severity. Fingerprints cover normalized stimulus text, prompts, and option text. They support exact normalized duplicate detection only, not semantic similarity.

## Persistence and authorization

Migration `202609010030_general_academic_foundation.sql` adds normalized source-pack and question tables, GAM enums, essential JSON constraints, indexes, timestamps, soft deletion, and RLS. Students and anonymous clients receive no GAM access. Reviewer/admin reads are RLS-controlled; mutations require the existing admin role. Browser roles receive no direct write grant.

Atomic service-role-only RPCs create and update drafts. The server persistence service independently verifies the actor's existing `admin` role, validates the pack, forces `draft`, computes the fingerprint, and reconstructs stored rows through the canonical schema. No Phase 1 function approves or publishes content.

Future student attempts should snapshot the exact canonical source pack and questions rather than depend on mutable authoring rows.

## Safety limits

Imports are capped at 512 KB. Additional limits cover title/topic/stimulus length, stimulus resource counts, table dimensions, graph series and points, questions, explanation steps, tags, structured-data size, node count, and nesting depth. The constants live in `src/lib/general-academic/limits.ts`.

## Future phases

Later phases may add provider generation, deterministic/AI review, approval/publication, student Practice, analytics, and 90-minute mocks. They must all continue to use this canonical contract; no provider-specific domain model should be introduced.

## Phase 2 Admin Studio

The admin-only routes under `/admin/general-academic` provide manual authoring, pasted JSON, uploaded `.json`, validation, preview, draft save/reopen/update, canonical export, and a provider-neutral prompt helper. Page loaders and every mutation recheck the existing `admin` role server-side. The client never receives the Supabase service credential.

Paste and upload are transport differences only: both call the Phase 1 `parseGeneralAcademicPackJson` service and then enter the same canonical editor. Imported provenance (`origin` and safe `sourceMeta`) is preserved, while `review.status` is always forced to `draft`. Invalid input is never persisted. The prompt helper makes no network or provider API call.

Exact fingerprint lookup uses the Phase 1 indexed `content_fingerprint` column and warns without overwriting. Archive is intentionally deferred because Phase 1 exposes no archive/soft-delete persistence primitive. Phase 2 adds no migration and no student delivery policy.

## Phase 3.5 optional OmniRoute generation

The admin-only `/admin/general-academic/generate` route adds whole-pack generation as an optional convenience. Its Server Action calls a provider-neutral `GamGenerationProvider` boundary, currently routed to an OmniRoute adapter. The official OpenAI TypeScript SDK remains installed only as an OpenAI-compatible wire client: `baseURL` and bearer credentials are always the server-only OmniRoute values. There is no direct OpenAI endpoint or credential fallback.

This implementation assumes the OmniRoute v3.8.51 repository contract: an OpenAI-compatible `/v1/responses` endpoint, bearer API-key authentication, and provider/combo fallback owned by the gateway. The PrepDMAT browser cannot select a provider, upstream model, or route. The server sends `OMNIROUTE_GAM_MODEL` as the route/model identifier, while all upstream selection and fallback stay inside OmniRoute. No web search, file search, retrieval, image generation, or other tool is enabled.

The Structured Output definition is derived from the Phase 1 Zod schema with the SDK's `zodTextFormat` helper. One documented compatibility narrowing remains: canonical `figure.data` permits arbitrary-key JSON records, but strict OpenAI-compatible Structured Outputs require closed object property sets. For the provider request only, `figure.data` is narrowed to recursively nested primitive arrays, which remain a valid subset of the canonical `JsonValue` contract. No other GAM field is independently redefined. Returned output always passes through the unchanged Phase 1 importer and canonical validator; gateway schema support is not treated as a substitute for application validation.

The Server Action rechecks the existing `admin` role, validates the canonical generation config, checks complete gateway configuration, and consumes the existing database-backed `generation:general-academic` user bucket before the provider call. The default limit remains 25 whole packs per administrator per 24 hours (`OMNIROUTE_GAM_DAILY_LIMIT`). The SDK aborts the provider request after 55 seconds by default (`OMNIROUTE_GAM_TIMEOUT_MS`). Gateway authentication, rate limits, quota, timeout, unavailable routes, exhausted upstreams, refusals, malformed responses, structured-output failures, and unknown failures are converted to safe codes and messages without returning credentials, raw provider bodies, or internal routing details.

Provider output cannot set administrative provenance or lifecycle. Server code replaces origin with `external_ai`, sets `sourceMeta.provider = "omniroute"`, records the server-selected route in `sourceMeta.model`, sets time and generation ID, clears external provenance and review notes, and forces `review.status = draft`. Historic drafts with `origin = "openai"` remain valid under the Phase 1 schema. Successful schema validation is described as "Structure valid", never factual answer verification.

Generation is ephemeral. It may perform an exact fingerprint read for a duplicate warning, but it never inserts or updates GAM rows. The generated preview can be exported and then enters the same shared canonical editor as manual and imported content. The editor's `Save Draft` action remains the first and only generation persistence point. Missing or failed OmniRoute configuration leaves manual authoring, JSON import, canonical export, and the provider-neutral external prompt fully available.

### Server environment

Set these only in `.env.local` or the deployment platform's encrypted server environment:

```dotenv
OMNIROUTE_BASE_URL=http://127.0.0.1:20128/v1
OMNIROUTE_API_KEY=replace-with-a-gateway-api-key
OMNIROUTE_GAM_MODEL=replace-with-gam-route-or-combo
OMNIROUTE_GAM_TIMEOUT_MS=55000
OMNIROUTE_GAM_DAILY_LIMIT=25
```

`OPENAI_API_KEY`, `OPENAI_GAM_MODEL`, `OPENAI_GAM_TIMEOUT_MS`, and `OPENAI_GAM_DAILY_LIMIT` are deprecated for GAM generation and are ignored. An OpenAI credential is never reused as an OmniRoute credential.

For local development: start OmniRoute; configure its provider connections and GAM route/combo; create a scoped OmniRoute API key; set the variables above; start PrepDMAT; then open `/admin/general-academic/generate` as an administrator. The example loopback URL is only a local default and is not hardcoded in application logic.

## Phase 4 review and publication

Normal generation now asks only for domain, optional topic, difficulty, and question count (default six). Skill and non-text representation preferences remain available in a collapsed Advanced options section. Empty preferences are sent to the provider as `AUTO`; application code does not randomly assign them. Easy, medium, and hard requests contain distinct cognitive-complexity guidance, while every returned skill and representation still has to satisfy the canonical registries and schema.

Formula objects preserve the authoritative machine `expression` and may add `display.latex`. Variables likewise retain the machine `symbol` and may add `displaySymbol`. These additions are optional and nullable for strict structured-output compatibility, so older Phase 1–3.5 packs remain valid. The importer, generated JSON Schema, example, editor, export, and provider-neutral OmniRoute format all derive from the same Zod contract.

The shared `FormulaCard` renders presentation metadata with KaTeX using `trust: false`, strict parsing, bounded expansion, and HTML+MathML output. It falls back first to a deliberately small safe expression conversion and then to React-escaped machine text. The machine expression remains available as accessible and administrator-facing text. Display formatting of units does not mutate stored canonical units.

`evaluateGeneralAcademicPackQuality` is deterministic and returns blocking findings, warnings, informational findings, and transparent metrics rather than a synthetic score. Canonical structure errors, placeholder choices, and proven answer-validation mismatches block progression. Distribution heuristics and safely recoverable math-presentation failures warn. Numeric checks use explicit tolerance; exact categorical/text/Boolean checks never infer semantic equivalence; unsupported cases remain marked for human review.

The review workflow is `draft → needs_review → approved → published`, with controlled return/rejection/archive branches. Approval requires the complete human checklist. Rejection requires a reason. Every transition re-authenticates an administrator, reloads the current pack and status, reconstructs the canonical pack, reruns deterministic validation, and uses a compare-and-transition database RPC. Approval and publication also report exact published-fingerprint matches without overwriting content. The additive `202609020031_general_academic_review_lifecycle.sql` migration records server timestamps/actors and appends lifecycle events.

Only drafts are editable. For an approved pack, an administrator must reopen review and return it to draft before changing academic content, which clears stale approval metadata. Published packs are read-only in the normal editor; the Phase 4 revision path is to archive the published pack and create a new draft. Archived packs cannot be directly republished. Phase 4 adds no student GAM route, attempt engine, mock, scoring, or analytics.

### Production deployment warning

A Vercel deployment cannot call OmniRoute running on a developer computer through `localhost` or `127.0.0.1`; those addresses refer to the Vercel runtime itself. Production requires a remotely hosted OmniRoute endpoint that Vercel can reach. Use HTTPS, gateway authentication, a restricted/scoped API key, network allowlists where practical, rate limits, logging that redacts credentials and generated source bodies, and a protected OmniRoute dashboard. Do not expose an unauthenticated local gateway, dashboard, or broad provider credentials to the public internet. Store the remote URL and key only in Vercel's encrypted server environment and rotate them if exposed.

## Phase 5 student practice

Authenticated students can start General Academic practice at `/practice/general-academic`. Selection is source-pack-first: domain, skill, difficulty, and mixed choices select one complete canonical pack rather than combining unrelated questions. Only lifecycle `published`, non-deleted packs are eligible. If no matching pack exists, the student receives a safe empty state and Core Practice remains available.

Student delivery uses an explicit public snapshot allowlist. It includes the source, representations, prompts, options, skills, and difficulty needed by the workspace, but excludes correct answers, explanations, deterministic validation metadata, review state, administrative notes, and provenance. A separate private snapshot stores the frozen answer key and explanations for server-side scoring and post-submission review. Neither snapshot is read directly from the browser: browser roles have no table or RPC grants, and authenticated server code verifies ownership for every load and mutation.

Migration `202609030032_general_academic_student_practice.sql` adds dedicated attempt and answer tables with RLS, a single-active-attempt constraint, indexes, and service-role-only create/save/submit/abandon RPCs. Attempts snapshot the source pack so later authoring changes cannot alter an in-progress or historical result. Answers, flags, and current position are autosaved; refresh and cross-device resume reload the persisted server state. Submission is idempotent, locks further edits, and computes all counts on the server from the private snapshot. Client-supplied scores and answer keys are never accepted.

Untimed practice reports wall-clock elapsed time. Timed practice grants 120 seconds per linked question and stores a server-created absolute expiry, so the clock continues while the page is closed. The workspace does not reveal correctness or explanations during an attempt. Students may navigate, revise, and flag questions, then submit with unanswered items after confirmation. Results show aggregate and per-skill performance; detailed review reveals the frozen correct answers and canonical explanations only after submission.

The Practice hub links to GAM without changing Core Practice behavior, and the dashboard shows an active GAM resume card plus recent GAM activity below the existing Core-priority actions. Existing bookmarks and mistake-review records are intentionally not reused: those tables depend on Core question-bank identities and immediate-feedback semantics. GAM bookmark and mistake-queue support remains deferred until it can use source-pack-aware identities without weakening either module. Phase 5 does not add General Academic mocks or runtime AI generation.

## Phase 6 learning loop

Migration `202609030033_general_academic_learning_loop.sql` adds dedicated `general_academic_bookmarks` and `general_academic_mistakes` tables. Core learning tables remain unchanged because their canonical-question and Core snapshot identities cannot correctly represent a source-dependent GAM question. Both GAM tables are RLS-enabled with browser grants revoked; reads and mutations continue through authenticated server-only data access.

Bookmarks can be created only from an owned submitted GAM attempt. The service-role-only toggle RPC verifies that the question exists in both halves of that attempt's immutable snapshot, then enforces one logical bookmark per user, pack, and question. The originating attempt supplies historical source, question, answer, correct answer, and explanation context even after the live pack is archived. Toggling the same logical bookmark from a later completed retake updates its source attempt rather than duplicating it.

Mistakes are automatic learning metadata, never browser assertions. A database trigger runs only when an attempt first transitions to `submitted`. An answered incorrect question creates or reactivates its logical mistake and increments `times_incorrect`; a later correct answer resolves an existing mistake and increments `times_correct_after_mistake`. Unanswered questions remain visible in attempt and cumulative analytics but do not enter Mistake Review. Repeated idempotent submission cannot rerun the trigger. The migration backfills existing submitted Phase 5 attempts in chronological order without editing their snapshots, answers, scores, or timing.

Cumulative analytics are computed by a service-role-only SQL aggregation over submitted immutable snapshots and stored answers. Counts include completed packs, presented questions, answered, correct, incorrect, unanswered, per-skill metrics, per-domain metrics, overall accuracy, and accuracy over the latest five submitted packs. Retakes are independent completed attempts and therefore contribute new observations. Accuracy remains consistent with Phase 5: correct answers divided by all linked questions, including unanswered questions.

Weakness labels are intentionally simple: at least three linked questions and accuracy below 70%. Smaller samples are labelled as needing more practice for a reliable trend, never weak. Recommendations are deterministic and use only current published, non-deleted inventory. Priority is active mistakes in an eligible weak skill, another eligible weak skill, an eligible weak domain, an unpractised available skill, an unpractised available domain, then mixed practice. Every recommendation routes through Phase 5 whole-pack selection; archived or deleted content can remain historically reviewable but cannot be recommended or retried.

Student routes provide grouped source-aware bookmarks and mistakes, responsive source/review panels, transparent GAM progress, and compact dashboard/results links. Phase 6 adds no isolated mistake exam, AI recommendation, runtime OmniRoute dependency, adaptive engine, official scoring claim, or GAM mock.

## Phase 7 full mock engine

General Academic mocks use dedicated `general_academic_mock_attempts` and `general_academic_mock_answers` tables because Core mocks assume independent Core question-bank items and section-specific timing. GAM mocks preserve complete source packs as atomic composition units.

- The one official-format property represented is the shared 90-minute GAM duration.
- The 24–32 question composition target and 18-question/three-pack minimum are transparent PrepDMAT simulation policies, not claims about the live dMAT question or pack count.
- Composition version `general-academic-mock-composition@1` uses a persisted server seed, current published/non-deleted inventory, deterministic diversity scoring, and a two-mock recent-pack avoidance window.
- A selected pack is never split to hit an exact target. Pack integrity may take the total above the target maximum when no fitting pack can reach the target minimum.
- The complete student-safe public snapshot is separate from the private answer/explanation snapshot. Only submitted server-side review paths read the private snapshot.
- One server-controlled expiry covers every pack. Saves and submissions lock the owned attempt, reject or finalize expired state, and calculate scoring without client-provided correctness.
- Practice and mock observations contribute equally to the transparent Phase 6 cumulative metrics. Mock submission updates the same logical mistake identities exactly once.
- Historical mock results and reviews use immutable snapshots. Archived packs remain reviewable but are excluded from future compositions.

## Phase 8 content scale, coverage, and quality

Phase 8 is an administrator-only content-intelligence layer over the existing canonical pack, question, quality, lifecycle, generation, and import systems. It introduces no second domain, skill, difficulty, representation, quality, or status taxonomy and requires no database migration. Active inventory metrics exclude soft-deleted and archived content; archived packs remain visible in lifecycle totals and historical student snapshots.

The coverage engine reports lifecycle, domain, skill, PrepDMAT difficulty, representation, origin, and four published cross-coverage matrices. Configuration-driven targets are explicitly internal PrepDMAT editorial targets: three published packs per domain, eight published questions per skill, three published packs per representation, and twelve published questions per difficulty. Domain/skill affinity is advisory and influences recommendations only; it never blocks legitimate authoring.

Deterministic component fingerprints cover normalized pack payload, source, question structure, option structure, and formula structure without IDs, reviewers, or timestamps. Local token overlap and structural normalization produce separate exact-source, exact-question, exact-pack, source-overlap, stem-overlap, option-overlap, shared-structure, and numeric-variant signals. Similarity remains a human-review signal, not a plagiarism finding or automatic lifecycle decision.

Batch quality audits aggregate Phase 4 blockers with conservative source-reference, placeholder, distractor-length, near-option, answer-position, and repeated-pattern warnings. The inventory-health state is transparent (`healthy`, `needs_attention`, or `critical`), not an opaque score. Mock readiness means only that PrepDMAT can compose useful internal practice simulations; it does not claim equivalence with an official exam distribution. Practice readiness and repeat resilience use the same published-only inventory.

Pipeline-aware recommendations prefer fixing blockers, publishing already approved content, and reviewing existing backlog before creating more packs for a gap. The admin planner links to coverage, quality, review, generation, and CSV reporting. Reports contain content metadata only and never student data.

Batch generation is bounded to five sequential whole-pack calls. Each item consumes the existing `generation:general-academic` limiter, receives explicit diversity guidance, passes the existing OmniRoute normalization/canonical validation plus Phase 8 quality and similarity checks, and is saved only as a draft. Failures are isolated per item, except a rate-limit or security-control failure stops further provider calls. Batch JSON import is bounded to twenty packs and 512 KB; preview parses, normalizes, validates, and checks similarity without persistence, then revalidates selected packs before draft creation. Bulk lifecycle actions support only `draft → needs_review` and `approved → published`; every pack uses the existing lifecycle service independently, and bulk approval is deliberately unavailable.

All Phase 8 pages and mutations re-authenticate the existing administrator role. The server-only data-access layer is the only reader of unpublished packs, private answers, review notes, and provenance. OmniRoute configuration remains server-only, student routes make no provider calls, and published packs remain immutable under the Phase 4 archive/replacement policy.
