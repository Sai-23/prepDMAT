# PrepDMAT performance Phase 4 measurement gate

Date: 2026-09-27

## Status

Phase 4 is **measurement-blocked**, not optimization-complete. No query, RPC,
index, cache, DTO, or assessment-flow change is justified until live structured
timing samples and representative query plans are available.

The repository contained no exported `[performance]` events. It was not linked
to a Vercel project, the saved Vercel CLI token was invalid, and the connected
browser runtime was unavailable. Consequently, the requested minimum of about
30 successful samples per operation could not be collected without inventing
data or exercising an unidentified production student account.

## Measurement support added

- `mock.start_or_resume` now records the numeric `resumed` metric, allowing the
  analyzer to report `mock.start` and `mock.resume` separately.
- response-byte measurement now records the time spent serializing the response
  under the `serialization` stage.
- `npm run analyze:performance -- <log-file>` accepts plain or Vercel JSONL
  exports and reports successful-sample min/max/p50/p75/p95/average values,
  internal stage statistics, response-byte statistics, error counts, dominant
  categories, and observed `sample count × average latency` impact.
- the analyzer never prints raw log messages or arbitrary metadata.

Error events are counted but excluded from latency percentiles. Mock events
recorded before the `resumed` metric was added remain honestly labeled
`mock.start_or_resume` rather than being guessed into either group.

## Live infrastructure evidence

A read-only request to `https://prepdmat.in/` returned:

- `Server: Vercel`
- `X-Vercel-Cache: MISS`
- `X-Vercel-Id: bom1::iad1::...`

This shows the observed request entered through Mumbai (`bom1`) and was associated
with `iad1` in the Vercel request identifier. It is a reason to verify the
configured function and database regions, but it is not enough to attribute
application latency without the internal timing distribution.

The configured Supabase endpoint was reachable through a Mumbai Cloudflare edge.
That edge location does **not** identify the Postgres region. The project region
must be read from Supabase Dashboard project infrastructure settings (or the
Management API with an authorized token).

## Required collection

After authenticating the Vercel CLI with an account that can read the project,
aggregate structured events without writing raw logs to the repository:

```powershell
npx vercel@latest logs prepdmat.in --since 7d --limit 5000 --json --query "[performance]" |
  npm run analyze:performance -- --json
```

Collect approximately 30 successful observations for each practical operation:

- `practice.start`, `practice.submit_answer`, `practice.next_question`,
  `practice.complete`
- `mock.start`, `mock.resume`, `mock.save_answer`, `mock.section_transition`,
  `mock.complete`
- `page.practice`, `page.tests`, `page.mock_take`, `page.dashboard`,
  `page.results`, `page.progress`

Use a designated staging student and representative seeded history. Do not
generate the sample by repeatedly mutating an unidentified production account.

## Evidence still required before optimization

1. Save the aggregate JSON/Markdown output, not raw logs, under a local report
   location.
2. Use the hot stages from that aggregate to select only the corresponding
   Phase 3 `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)` statements.
3. Capture before/after plans only for a measured hot query; do not add an index
   based on a static guess.
4. Record the Vercel function region and Supabase Postgres region from their
   dashboards.
5. Profile `/results` with an authenticated staging session for hydration,
   commit count, and render cost.
6. Compare cold and warm requests for the published Mock catalog and public
   testimonial cache, then exercise the existing admin invalidation path.
7. Disable `PERFORMANCE_TIMING_ENABLED` after the controlled diagnostic window.

## Changes deliberately rejected

- No Practice or Mock SQL/RPC rewrite: no live dominant-stage evidence.
- No new or removed index: no representative `EXPLAIN ANALYZE` plan.
- No response DTO reduction: no measured oversized hot response.
- No new memoization, pagination, virtualization, or dynamic import: no browser
  profile or route-specific measured regression.
- No auth/rate-limit change: their latency contribution is not yet quantified.

This preserves authentication, RLS, grading, ownership, immutable snapshots,
answer durability, timers, CSP, and admin authorization while keeping the
instrumentation opt-in.
