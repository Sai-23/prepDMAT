# PrepDMAT Public Diagnostic, Register Fixes, and Mock Library 5.0

## 1. Public Diagnostic previous architecture

The only diagnostic lived under `/onboarding/diagnostic`. Its page called `requireUser`, read the authenticated profile, and persisted immutable questions and answers in the private `practice_sessions` and `practice_session_items` model. The public navigation and landing CTAs pointed at `/onboarding`, so an anonymous visitor reached authentication before experiencing a question.

## 2. New anonymous architecture

The public funnel is now:

`/diagnostic` → `/diagnostic/take` → `/diagnostic/result` → Register or Sign in

It reuses the existing 15-question generator and diagnostic response UI, but not the authenticated persistence boundary. Anonymous sessions use separate `public_diagnostic_sessions` and `public_diagnostic_items` tables. A 256-bit opaque token is stored in an HttpOnly, SameSite=Lax, production-Secure cookie for two hours; only its SHA-256 hash is persisted. The server returns only the current public question snapshot.

Authenticated visitors retain the existing flow. `/diagnostic` routes an in-progress or completed authenticated diagnostic to its existing private route/summary, while a not-started authenticated visitor starts through the existing private diagnostic action.

## 3. Public diagnostic security model

- Public diagnostic tables have RLS enabled and all table privileges revoked from `public`, `anon`, and `authenticated`.
- Create, answer, and claim RPCs are granted only to `service_role` and are called only from server-only modules.
- Anonymous visitors never query `questions`, private attempts, or private student data.
- Creation, answer submission, and claim have separate bounded shared rate-limit operations.
- Creation accepts exactly 15 immutable snapshots: five per Core module, positions 1–15, with the existing easy/medium/hard mix enforced.
- Answer persistence locks the token-owned session, accepts only its exact current question, accepts only an unanswered item, grades on the server, and advances in the same transaction.
- The browser-provided session/question UUIDs are identifiers, not authority. The unguessable HttpOnly bearer token plus exact server-owned current position is required.
- The public session expires after two hours; the database RPC rejects expiry beyond 24 hours.

No existing RLS policy, migration 027 privilege, generator, grading algorithm, or private assessment rule was weakened.

## 4. Question/answer leakage analysis

The client receives `public_snapshot` for one current question. `private_snapshot`, correct answers, explanation traces, fingerprints, stored token hashes, and service-role credentials never enter the returned diagnostic state. The shared question UI contains no correctness branch during the attempt. Even after completion, the public result contains only overall and per-module aggregates plus strongest/focus guidance; it does not return answer keys or item reviews.

## 5. Account claim behaviour

Successful password login, immediate signup session, email OTP verification, phone OTP verification, and OAuth/email callbacks attempt the same server-side claim before resolving the post-auth route. The claim RPC:

- locks by authenticated user and public token hash;
- requires a completed, unexpired public session;
- rejects a session already claimed by another user;
- is idempotent for the same user;
- copies the server-owned immutable snapshots, responses, grades, and timings into the existing completed private diagnostic model;
- updates onboarding/diagnostic profile state atomically;
- records the existing diagnostic completion event.

If the account already has an in-progress or completed private diagnostic, the public session is consumed without overwriting that authoritative history. A temporary claim failure does not invalidate the legitimate auth session and retains the HttpOnly cookie for a later idempotent retry. A successful claim makes `getPostAuthRoute` resolve to Dashboard, so the student is not asked to retake the diagnostic.

## 6. Register “Use Different Email” root cause

The control was a link from `/register` to the same `/register` route. Next.js retained the mounted client component and its `useActionState`, OTP value, resend countdown, and pending-email view, so the intended reset did not occur.

## 7. Existing-account signup behaviour

After a successful but sessionless/ambiguous Supabase signup response, Register performs one ordinary `signInWithPassword` attempt under the existing `auth:login` limiter. A valid confirmed account establishes a legitimate session and routes through the shared post-auth/diagnostic-claim path instead of entering OTP. Invalid credentials, unknown accounts, unconfirmed accounts, limiter failures, and provider failures remain indistinguishable and receive the same generic verification UI.

Unverified users retain the existing resend and shared six-digit signup OTP recovery flow. Ordinary Login remains password-only.

## 8. Supabase anti-enumeration constraints

No admin lookup, service-role email-existence query, public existence endpoint, or Confirm Email change was added. The implementation recognizes only proof supplied by a successful supported password sign-in. Failed checks expose neither provider codes nor account-existence differences.

## 9. Exact safe Register solution

“Use a different email” is now a native button. It increments a local form generation key, unmounting the complete verification subtree and restoring a fresh registration subtree without a page reload. This clears OTP text, resend interval/countdown, action errors, masked-email state, and in-flight guards. The restored email input has autofocus. Repeating A → reset → B uses the same clean transition.

## 10. Mock page before/after information architecture

Before: all curated mini mocks appeared as large cards in one “Other mock tests” grid.

After: the server-rendered Mock library uses semantic, compact responsive sections for Figure Sequences, Mathematical Equations, Latin Squares, and a bounded Mixed Core fallback for genuinely multi-module tests. The on-demand Full Core card and `DMAT_CURRENT_CORE_PROTOCOL` remain unchanged and continue to follow `ENABLE_ON_DEMAND_CORE_MOCKS`.

## 11. Module grouping

Classification comes from the current persisted section types, not title parsing. A test enters a module-specific group only when all current sections have the same supported Core question type. Mixed, empty, or unsupported collections cannot be mislabelled and use the Mixed Core fallback. Each catalog row is mapped once, preventing duplicate cards.

## 12. Completion and Retake state

Cards display a text-labelled check icon and “Completed”, plus Best, Latest, and Attempts. Actions are explicit:

- not attempted: Start mock;
- active attempt: Resume mock;
- completed: Try again.

Completed cards remain fully enabled. Cards use a compact one-column mobile layout and expand to two/three columns without a carousel dependency.

## 13. Attempt persistence

The existing `startTestAttempt` contract was preserved. It resumes only a still-active `in_progress` attempt. Once submitted, the next start creates a fresh UUID and immutable attempt snapshot, independent responses, submission timestamp, and score. No submitted row is reset or overwritten. Results already list all persisted completed attempts separately with their date and attempt ID link.

## 14. Best/latest aggregation

`get_curated_test_attempt_summaries(user_id, test_ids[])` returns one row per requested template with submitted attempt count, maximum score, most recently submitted score/time, and active-attempt state. Latest is ordered by `submitted_at DESC`; best is `MAX(score)`. The UI normalizes database numeric/bigint values before display.

## 15. Database/query impact

One migration adds two isolated public-diagnostic tables and four service-role-only RPCs (create, answer, claim, and mock summaries). The catalog uses one batched summary RPC for all visible test IDs, alongside its existing bounded section/access reads. It does not load response rows and introduces no per-card/N+1 attempt query.

Migration to apply before deployment:

`supabase/migrations/202608290028_public_diagnostic_and_mock_summaries.sql`

## 16. Accessibility

- Existing labelled native diagnostic answer controls and keyboard save behaviour are reused.
- Correctness remains announced only after completion.
- Result content uses page/Card headings and keyboard-accessible Register and Sign-in links.
- Use Different Email is a native button and restored Email receives focus.
- Mock groups use nested semantic sections/headings.
- Completed state includes visible text, not colour alone; Best, Latest, and Attempts use `dl` labels.
- Primary mock actions distinguish Start, Resume, and Try again.
- Touch targets retain the existing minimum heights and all grids collapse without fixed minimum page widths.

## 17. Bundle impact

Client-reference manifest byte totals (unique referenced JS chunks, uncompressed):

| Route | Before | After | Change |
| --- | ---: | ---: | ---: |
| Register | 334,995 B | 337,525 B | +2,530 B |
| Mock library | 321,962 B | 330,586 B | +8,624 B |
| Authenticated diagnostic | 461,146 B | 469,406 B | +8,260 B |
| Public diagnostic start | n/a | 325,480 B | new route |
| Public diagnostic take | n/a | 463,927 B | new route |
| Public diagnostic result | n/a | 322,926 B | new route |

No dependency was installed. The public start/result routes do not load the response renderer; only the take route loads the existing diagnostic engine.

## 18. Tests

Added or updated coverage for:

- anonymous public start and answer actions;
- public route/auth separation;
- 15-question, 5+5+5 and difficulty contracts;
- opaque cookie, token hashing, expiry, revocations, service-role-only RPCs, current-question locking, answer hiding, claim isolation, and idempotency contracts;
- diagnostic claim integration through auth entry points;
- safe valid-existing-account recognition and indistinguishable invalid/unconfirmed outcomes;
- in-place email switching, state reset, duplicate guards, OTP bounds, and email focus;
- module classification and misclassification fallback;
- persisted best/latest/count normalization and bounded aggregation SQL;
- Start/Resume/Try again labels and immutable retake creation;
- unchanged Full Core protocol reference and existing security regression suite.

Results:

- targeted: 87/87 passed;
- full suite: 128 files passed, 731 tests passed;
- 17 files / 27 tests are existing opt-in audit suites and remained skipped by the default test command.

## 19. Build

- `npm run lint`: passed.
- `npm run typecheck`: passed.
- `npm test`: passed (731 passed, 27 existing opt-in tests skipped).
- `npm run build`: passed with Next.js 16.3.3; `/diagnostic`, `/diagnostic/take`, and `/diagnostic/result` are present in the production route table.
- `git diff --check`: passed; Git emitted only repository line-ending conversion warnings.

## 20. Manual steps and migrations

Before deployment:

1. Apply migration 028 in the intended Supabase environment.
2. Confirm both public diagnostic tables have RLS enabled and no grants/policies for `anon` or `authenticated`.
3. Confirm the four new RPCs are executable only by `service_role`.
4. Exercise anonymous completion and OTP, Google, and password-login claim paths against staging.
5. Verify the configured trusted client IP header so the existing shared limiter can apply its IP buckets at the deployment proxy.
6. Verify multiple submitted attempts for one curated mock produce the expected Best/Latest/Attempts values.

The migration was created but was not applied to a live database in this task. No live RLS probe was performed.

## 21. Viewport verification

The in-app browser runtime reported that no controllable browser was available. Automated layout contracts and production compilation pass, but the requested visual matrix was not executed.

MANUAL VIEWPORT VERIFICATION REQUIRED for Public Diagnostic, Register OTP, and Mock library at:

- desktop: 1920×1080, 1440×900, 1366×768, 1280×720;
- mobile: 430×932, 390×844, 375×812, 320×568.

## 22. Final verdict

**CODE READY — MANUAL VERIFICATION REQUIRED**

This is not a production-readiness claim. Applying migration 028, live RLS/grant validation, staging auth/claim verification, and the viewport matrix remain deployment gates.
