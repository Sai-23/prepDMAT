# On-demand Core mock staging checklist

Do not mark browser behavior verified from unit tests alone. Complete this checklist in a staging environment with the Phase 6 migration applied.

## Deployment

- Apply migrations through `202608220017_on_demand_core_mocks.sql`.
- Confirm the three Phase 6 RPCs are executable only by `service_role`.
- Confirm authenticated/anonymous roles cannot select `generated_core_mocks`, `practice_attempt_items`, or `core_mock_generation_events` directly.
- Set `ENABLE_ON_DEMAND_CORE_MOCKS=true` only in staging.
- Confirm `CORE_MOCK_HISTORY_WINDOW` is between 1 and 5; start with 3. Exact fingerprints remain protected across five compact histories.
- Confirm `CORE_MOCK_GENERATION_COOLDOWN_SECONDS` is between 0 and 300; start with 30.
- Keep `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` stable across staging instances if the deployment uses more than one instance.

## Student happy path

- Sign in as a normal student and open `/tests`.
- Confirm the generated-mock card states 60 questions, three Core sections, and 25 minutes per section.
- Select **Generate New Core Mock** and confirm an honest generating state appears without a fake percentage.
- Confirm exactly one `generated_core_mocks` row, one generated `test_attempts` row, 60 immutable items, and 60 response rows are created.
- Confirm the student is routed into the existing test runner and the first section clock starts from the persisted server timestamp.
- Answer several questions and refresh. Confirm responses, current section, current question, and remaining time restore correctly.
- Let a section expire and confirm automatic transition without response loss.
- Complete all three sections, submit, and review score, per-question answers, and generated explanations.
- Return to Dashboard and Results. Confirm the attempt is labelled **Generated**, while published bank mocks remain labelled **Curated**.

## Novelty and repeat generation

- After the cooldown, generate another mock for the same student.
- Confirm recent history was loaded from no more than the configured number of generated mocks.
- Compare compact fingerprints/profiles server-side and confirm there are no exact repeats or accepted pairs at/above the configured `0.94` threshold.
- Confirm recurring broad families are reported as taxonomy recurrence, not falsely described as permanent uniqueness.

## Idempotency, concurrency, and failure

- Submit the same `generationRequestId` twice and confirm both resolve to one mock/attempt.
- Submit two different request IDs concurrently for the same user and confirm only one enters generation.
- Generate concurrently as two different users and confirm both can succeed independently.
- Simulate assembler failure and transaction failure. Confirm the request becomes `failed`, telemetry contains a safe reason code, and no attempt/items/responses survive.
- Confirm a failed request can be retried with a new request ID.
- Confirm rapid repeat generation receives the configured short cooldown rather than creating another mock.

## Security

- Confirm unauthenticated action invocation redirects/rejects.
- Confirm changing a mock, attempt, or question UUID cannot expose another student's data.
- Confirm a student cannot query another student's generated history or generation telemetry.
- Confirm public snapshots contain no correct answer, private snapshot, seed, fingerprint, or generator diagnostics.
- Confirm a normal student cannot open admin diagnostics; an administrator can see owner ID, status, timestamps, versions, quality score, and gate status.

## Rollback

- Disable `ENABLE_ON_DEMAND_CORE_MOCKS` to remove the entry point without affecting existing generated attempts.
- Confirm already-created generated attempts remain restorable and gradeable because their snapshots are immutable.
- Curated catalog, attempts, timers, scoring, results, and admin publication must remain operational throughout rollback.
