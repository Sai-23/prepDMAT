# PrepDMAT performance Phase 3

## Safe staging instrumentation

Set `PERFORMANCE_TIMING_ENABLED=true` only in Development or Preview/Staging.
Production defaults to disabled. Each completed operation emits one structured
`[performance]` JSON line containing only:

- operation and stage names;
- elapsed milliseconds;
- numeric row/question counts;
- serialized response byte count;
- success/error outcome.

The timing API accepts no arbitrary metadata, so user IDs, email addresses,
tokens, answers, feedback text, and question content cannot be attached to an
event accidentally.

Instrumented server actions:

- `practice.start`, `practice.submit_answer`, `practice.next_question`,
  `practice.complete`;
- `mock.start_or_resume`, `mock.save_answer`, `mock.section_transition`,
  `mock.clock_transition`, `mock.complete`.

Instrumented page data paths:

- `/practice`, `/tests`, `/tests/[testId]/take`, `/dashboard`, `/results`,
  `/progress`.

Collect at least 30 successful samples per operation in staging. Compare p50,
p95, and the largest stage within each operation. Do not compare local mocked
durations with production network timings.

## Proven round-trip reductions

| Flow | Before | After | Change |
| --- | ---: | ---: | --- |
| Practice start persistence | creation RPC + classification update | creation RPC | one database round trip and one parent-row update removed |
| Mock answer save | 3 parallel reads + secure save RPC | immutable-item read + secure save RPC | two database reads removed |

The secure mock save RPC still validates ownership, in-progress state, section
expiry, active-section membership, response bounds, and response-row existence.
The immutable-item read remains because the server validates the submitted
answer against the stored question response format before calling the RPC.

## Hot-query and index audit

| Query | Shape / expected rows | Existing index decision |
| --- | --- | --- |
| Active Practice | `user_id`, `status=in_progress`, newest; 0-1 row | partial unique `idx_practice_sessions_one_active_user` already matches |
| Practice current item | `session_id`, `position`; 1 row | `idx_practice_session_items_session(session_id, position)` matches |
| Practice answer item | `session_id`, `question_key`; 1 row | session index narrows the small immutable manifest; no additional index added |
| Completed Practice history | `user_id`, completed, newest 100 | Phase 2 partial `idx_practice_sessions_completed_history` matches |
| Mock attempt by ID | primary-key lookup; 1 row | primary key matches |
| Mock section snapshot | `attempt_id`, `section_key`, ordered position; one section | `idx_practice_attempt_items_section_key` matches |
| Mock response | `attempt_id`, `question_key`; 1 row | unique `idx_user_responses_question_key` matches |
| Mock responses for attempt | `attempt_id`; one attempt | `idx_user_responses_attempt_id` matches |
| Completed Mock history | `user_id`, submitted statuses, newest 6/30 | added `idx_test_attempts_completed_history` to match filter/order |
| Active Mock dashboard/resume | `user_id`, in-progress; normally very few rows | existing `(user_id,status)` index narrows sufficiently; no speculative sort index |

## Staging EXPLAIN commands

The local environment has no migrated PostgreSQL/Supabase instance, so no query
plan is claimed here. Run these read-only statements against a representative
staging database after applying migration `202609270038`:

```sql
begin read only;

explain (analyze, buffers, verbose, format json)
select id, display_title, submitted_at, accuracy
from public.test_attempts
where user_id = '<STAGING_USER_UUID>'::uuid
  and status in ('submitted', 'auto_submitted')
order by submitted_at desc
limit 30;

explain (analyze, buffers, verbose, format json)
select id, module, current_position, completed_at
from public.practice_sessions
where user_id = '<STAGING_USER_UUID>'::uuid
  and status = 'completed'
  and session_type <> 'diagnostic'
order by completed_at desc
limit 100;

explain (analyze, buffers, verbose, format json)
select question_key, section_key, section_position, public_snapshot, position
from public.practice_attempt_items
where attempt_id = '<STAGING_ATTEMPT_UUID>'::uuid
  and section_key = '<STAGING_SECTION_UUID>'::uuid
order by section_position;

explain (analyze, buffers, verbose, format json)
select question_key, response_payload, response_status,
       is_marked_for_review, time_spent_seconds
from public.user_responses
where attempt_id = '<STAGING_ATTEMPT_UUID>'::uuid;

rollback;
```

Confirm index scans, actual row counts close to estimates, no material explicit
sort on completed history, and no large buffer reads. RPC internals should be
profiled with the structured application stages plus Supabase/Postgres query
statistics; do not infer an internal plan from client latency alone.

## Request waterfalls

- Login to Dashboard: authentication redirect/navigation, then one Dashboard
  render whose independent activity, progress, and availability reads run in
  parallel. No new serial request was introduced.
- Dashboard to Practice: one RSC navigation; the Practice page loads landing,
  active session, onboarding, optional exact-question metadata, and optional GAM
  state in parallel.
- Start Practice: one server action. The former classification update is gone.
- Practice answer to feedback to next: two intentionally sequential actions.
  Durable answer feedback completes before explicit advancement.
- Tests to Mock: one start/resume action, followed by navigation to the attempt.
- Normal Mock question navigation: client-local; saves use the latest-value queue.
- Mock section transition: pending saves flush, then one transition action loads
  the next immutable section snapshot.
- Mock completion: pending saves flush, then one finalization action and local
  result state update.
- Dashboard to Progress: one RSC navigation and one progress data path.

## Hydration, render, assets, and feedback findings

- Mock and Practice timers are memoized child components with local one-second
  state. Timer ticks perform zero network calls and do not update parent state.
- Start Practice, Start/Resume Mock, answer checking, section transition, and
  submission already provide immediate disabled/pending labels and duplicate
  action guards. The stable question shell remains visible.
- Normal Mock navigation remains client-local and does not wait for persistence;
  the response queue preserves latest-value durability.
- Current production raw referenced-JS baselines (shared chunks included) were:
  `/practice` 495.2 KiB, `/dashboard` 348.5 KiB, `/results` 552.7 KiB,
  `/progress` 327.3 KiB, `/tests/[testId]/take` 477.3 KiB. This phase adds only
  server-only instrumentation, so no client bundle change is expected.
- No chart/date utility package or admin module was found leaking into these hot
  student boundaries. Broad component rewrites were rejected without browser
  parse/hydration evidence.
- Feedback admin code appears only in the admin feedback client manifest. The
  homepage testimonial projection remains capped at three rows and cached; it
  does not block or hydrate the primary homepage content.
- No oversized new images, priority/preload changes, duplicate fonts, or repeated
  large question-asset fetches were introduced.

## Region and budgets

No Vercel function region is declared in `vercel.json` or route configuration,
and the Supabase project region is not stored in the repository. A region match
cannot be inferred safely. In Vercel and Supabase dashboards, record both actual
regions and prefer a Vercel execution region geographically close to Supabase;
do not change either without a deployment and data-residency review.

Staging acceptance budgets:

- LCP < 2.5 s, INP < 200 ms, CLS < 0.1;
- normal page TTFB target < 500 ms;
- hot server-action target < 500 ms where network distance permits;
- option selection immediate and normal Mock navigation perceived < 200 ms;
- zero timer network calls per tick.
