# PrepDMAT Auth Providers + Assessment UX Refinement 3.0

## Verdict

**CODE READY — PROVIDER/VIEWPORT SETUP REQUIRED**

Do not deploy this application version until remote migrations `025`, `026`, and `027` have been applied and verified. A local build does not prove the remote database contract.

## 1. Google implementation

- Login and registration share one full-width `Continue with Google` action.
- The button uses a compact, recognizable four-colour Google mark, a stable 44px minimum target, keyboard focus through the existing button system, a disabled pending state, and `Redirecting to Google...` copy.
- The server action routes only to the existing `GET /auth/google` entry point.
- `/auth/google` remains feature-gated, consumes the existing `auth:google` database-backed limiter, starts the official Supabase `signInWithOAuth({ provider: "google" })` flow, and supplies only the application-owned callback URL.
- Provider/client exceptions and OAuth startup failures now return safe internal error codes. Consent cancellation is distinguished from other OAuth failure without forwarding provider details.
- No Google token, secret, caller destination, email, name, role, or user ID is accepted as client authority.

## 2. Google account and profile behaviour

The existing `public.handle_new_user` trigger is provider-neutral. It creates the same `profiles` and Student-role records for email, Google, and phone identities. Display-name fallback order is `display_name`, `full_name`, `name`, email local-part, then `Student`, so Google-specific metadata is optional.

Supabase documents that automatic identity linking links an OAuth identity to an existing user when the email matches under its verified-email safeguards. PrepDMAT does not manually merge `auth.users` rows and does not implement a custom linking protocol. See [Supabase Identity Linking](https://supabase.com/docs/guides/auth/auth-identity-linking).

## 3. Google callback behaviour

- `/auth/callback` exchanges the bounded PKCE code into the official cookie-backed Supabase session.
- It ignores caller-controlled `next` destinations and uses only `getPostAuthRoute`.
- A new student reaches `/onboarding`; an in-progress diagnostic resumes at `/onboarding/diagnostic`; a student who completed onboarding reaches `/dashboard`.
- Cancellation maps to `oauth_cancelled`; other provider callback errors map to `oauth_failed`; client/provider unavailability maps to `auth_unavailable`.
- Raw callback/provider descriptions are not reflected.

## 4. Phone implementation

- Email and Phone are now compact tabs, with Email selected initially. The phone form is not visually expanded alongside the email form.
- The UI defaults to India `+91` while retaining the existing supported international country choices.
- `requestPhoneOtpAction` performs bounded schema validation, then server-side E.164-compatible normalization before any provider call.
- The action uses official Supabase `signInWithOtp`, explicitly permits first-time account creation, and defaults both marketing consent fields to false.
- The confirmation view uses one bounded numeric six-digit field with `autocomplete="one-time-code"`, natural form Enter submission, paste support, masked destination copy, Verify, Change number, and a 60-second resend cooldown.
- `verifyPhoneOtpAction` uses official `verifyOtp({ type: "sms" })`, requires a returned user and session, and then uses the shared post-auth router.
- Provider and network exceptions are contained behind concise responses. No OTP or complete phone number is logged.

Supabase's official phone flow is documented at [Phone Login](https://supabase.com/docs/guides/auth/phone-login) and [verifyOtp](https://supabase.com/docs/reference/javascript/auth-verifyotp).

## 5. Phone-only account compatibility

Student-facing email assumptions were audited across the header, Profile, Dashboard/data models, Progress/analytics, mistakes, results, support-facing copy, and Admin analytics.

- Header reconciliation now accepts `user.phone` and renders `Student ····NNNN` when profile metadata and email are absent.
- Profile already renders `No email linked` and `No phone linked` explicitly.
- Email marketing is disabled when no email is linked; SMS preference is independent of authentication OTP delivery.
- Learning, assessment, grading, analytics, ownership, and Admin code use the authenticated user ID rather than email as authority.
- Forgot Password remains explicitly email-specific; a phone-only student can continue to use Phone login and is not given a fabricated email address.

## 6. OTP rate-limit and security preservation

No threshold was changed. Send and verify retain the existing global/account/IP security policy through `enforceSecurityRateLimit` before Supabase calls. The 60-second browser cooldown is UX only; it is not security authority. Bounded phone and token schemas, Supabase expiry/provider limits, generic errors, RLS, fresh `auth.getUser`, DB roles, fixed callback destinations, service-role isolation, and secure cookies remain intact.

## 7. Consent handling

The existing optional email-marketing checkbox remains on email registration. Google and Phone account creation explicitly starts email and SMS marketing consent as false, and the authenticated Profile screen remains the affirmative opt-in location. No mandatory terms-acceptance control existed in the current registration flow, so none was bypassed or invented.

## 8. Latin Square root cause

The grid was allowed to grow to 390px, producing roughly 78px cells before borders/gaps. Combined with default card padding, a 20px renderer gap, metadata, and the persistent action footer, this pushed the A–E response row below the visible question region on short laptop screens. The action remained visible, but the answer controls did not.

## 9. Latin before/after layout and responsive sizing

Before:

- grid width: up to 390px;
- renderer spacing: 20px;
- default assessment card header/content padding;
- answer options below the oversized grid.

After:

- grid width: `min(100%, clamp(17.5rem, 43dvh, 21.5rem))`;
- at 1366×768, `43dvh` is about 330px, or roughly 66px per cell before small borders/gaps;
- maximum grid width is 344px, while a 280px lower bound keeps letters readable where width permits;
- A–E remains one five-column row with at least 48px-high controls and the existing non-colour selected check/ring state;
- renderer gap is reduced to 12px and the answer heading gap to 6px;
- Practice, Diagnostic, and Mock use compact Latin-only card padding/typography;
- the existing assessment shell keeps the action footer fixed in the bounded flex layout and permits only the question-content region to scroll when height is genuinely constrained;
- `min(100%, ...)` prevents the grid and options from causing document-level horizontal overflow on narrow screens.

Generator logic, grading, answer persistence, and question data were not changed.

## 10. 1366×768 and viewport verification

Structural sizing and shell regression tests pass, but the in-app browser reported that no browser was available. Therefore the hard visual matrix was not executed and this report does not claim visual acceptance.

**MANUAL VIEWPORT VERIFICATION REQUIRED** at 1920×1080, 1440×900, 1366×768, 1280×720, 1024×768, 430×932, 390×844, 375×812, and 320×568.

At 1366×768 verify the full question, 5×5 grid, A–E row, visible selection state, and complete `Check Answer` action are simultaneously visible with no document-level horizontal scroll.

## 11. Mock walkthrough before/after

Before, historical Mock results passed `initiallyOpen` to Mathematical Equation, Figure Sequence, and Latin Square feedback, immediately rendering every full solution. Generic explanations were also shown directly.

After, result state, Your answer, Correct answer, concise quick explanation/diagnosis, and relevant result metadata remain visible. Full Core walkthroughs start collapsed but retain the all-steps view after the student selects `Show me how to solve it`. Generic explanations use the same collapsed student-facing disclosure. Expanded controls become `Hide walkthrough`.

No answer, explanation, or correctness is rendered by the active Mock runner before submission; grading and submission were not changed.

## 12. Practice review behaviour

Historical Core Practice review already used the same feedback components with their default collapsed state, so it required no behavioural change. Concise active Practice feedback still appears immediately after Check Answer, and the student can open the full walkthrough. Active Practice grading and explanation telemetry were not changed.

## 13. Accessibility

- Auth method controls use a labelled tablist, `role="tab"`, `aria-selected`, `aria-controls`, and labelled tab panels.
- Google, Email, Phone, OTP, resend, and change-number controls remain native buttons/forms with visible focus and disabled pending states.
- OTP uses numeric input mode and mobile one-time-code autocomplete.
- Walkthrough buttons use native buttons with `aria-expanded` and unique `aria-controls` targets; keyboard activation follows native button behaviour.
- Latin answer choices remain a radiogroup with `aria-checked`, descriptive answer labels, keyboard letter selection, visible focus, and a non-colour selected check.

## 14. Bundle changes

Measured from Next 16.3.3 production client-reference manifests before and after this refinement. Values are raw, uncompressed bytes across each route's referenced client entry chunks, including shared chunks; they are comparison figures, not transferred-byte claims.

| Route | Before | After | Delta |
| --- | ---: | ---: | ---: |
| Login | 333,320 B | 335,367 B | +2,047 B |
| Register | 333,320 B | 335,367 B | +2,047 B |
| Practice | 480,025 B | 480,372 B | +347 B |
| Mock review (`/results`) | 544,326 B | 545,078 B | +752 B |

No package or heavy phone/auth/UI dependency was added.

## 15. Tests and build

- Targeted auth/assessment/review run: 17 files, 93 tests passed.
- Additional Latin viewport contract: 1 file, 6 tests passed.
- Full regression: 125 files, 700 tests passed.
- Existing opt-in audit suites: 17 files / 27 tests skipped by their existing environment gates.
- ESLint: passed.
- TypeScript (`tsc --noEmit`): passed.
- Next production build: passed; 34 routes generated/validated, including `/auth/google`, `/auth/callback`, Login, Register, Practice, Mock, Results, and onboarding routes.
- No generator, grading, analytics, question-count, or security threshold changes were made.

## 16. Manual provider and deployment steps required

1. Apply and remotely verify migrations:
   - `202608280025_mistake_notebook_sources.sql`
   - `202608280026_mock_state_security.sql`
   - `202608280027_close_question_bank_scraping.sql`
2. Run the remote RLS/security verification suite and confirm the required RPCs/privileges exist before deployment.
3. In Supabase Auth, set the canonical Site URL and exact application callback allowlist; remove obsolete/wildcard redirects.
4. Configure Google's Supabase callback in Google Cloud, store the client ID/secret only in Supabase, enable the Google provider, then set `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true` for the intended deployment.
5. Configure/fund a supported SMS provider in Supabase, geographic permissions, sender/template compliance (including India TRAI/DLT review where applicable), CAPTCHA/provider limits, expiry, spend alerts, and delivery monitoring; only then set `NEXT_PUBLIC_PHONE_AUTH_ENABLED=true`.
6. In staging, test first-time and returning Google accounts, cancellation, provider failure, matching verified-email linking, first-time and returning phone accounts, invalid/expired OTP, resend/cooldown, rate limiting, provider outage, phone-only navigation/profile/learning flows, logout, and cross-device/session refresh.
7. Execute the full manual viewport matrix above in Light and Dark themes with keyboard-only navigation and a screen-reader spot check.

The more detailed provider checklist remains in `docs/AUTH-DEPLOYMENT.md`.
