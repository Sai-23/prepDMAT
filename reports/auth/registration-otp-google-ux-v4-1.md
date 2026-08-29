# PrepDMAT Registration OTP + Auth Reliability + Register UX 4.1

## Verdict

**CODE READY - MANUAL AUTH SETUP REQUIRED**

The application code, automated auth contracts, full regression, TypeScript, lint, production build, and dependency audit pass. Production still requires the Supabase confirmation-email template change and live provider/viewport checks described below.

## 1. Register CTA root cause

The previous Register card combined an 82px global header, up to 80px of page vertical padding, a four-field form, 48px controls, 16px form gaps, a long permanent password hint, long consent copy, Google/divider spacing, provider-consent copy, and the footer link. At a 768px-tall laptop viewport, this normal state exceeded the remaining main-area height and put the primary action below the initial viewport.

The defect was normal-flow height accumulation, not a clipped card or a missing button. No nested scrollbar or overlay was introduced.

## 2. Register structure before and after

Before:

- Google, divider, full name, email, password, confirm password, long password help, long consent text, Create account, provider-consent note, sign-in link;
- 48px fields, 16-20px component gaps, and 24-40px page padding.

After:

- Google, divider, email, password, confirm password, concise optional consent, Create account, sign-in link;
- compact card header and page padding, 44px registration fields, 12px component gaps, and the shorter password hint;
- the nonessential full-name field and provider-consent note were removed. The provider-neutral database trigger still safely derives a display name from provider metadata, email local-part, or `Student` and still creates exactly one profile/student role;
- all controls remain in one natural document flow with no fixed/sticky action, negative margin, or card/form scrollbar.

## 3. Viewport sizing

The compact normal-state structure materially reduces initial card height while retaining at least 44px controls. Static viewport contracts cover the required controls, compact mode, full-width mobile controls, absence of horizontal minimum-width hazards, absence of nested scrolling/sticky positioning, and the 1366x768 discovery contract.

The controllable in-app browser was unavailable, so CSS contracts are not represented as visual acceptance.

**MANUAL REGISTER VIEWPORT VERIFICATION REQUIRED**

Manually check 1920x1080, 1440x900, 1366x768, 1280x720, 1024x768, 430x932, 390x844, 375x812, and 320x568. At 1366x768 specifically confirm that Google, Email, Password, Confirm password, optional consent, and Create account are simultaneously visible. On mobile confirm no horizontal overflow and usable keyboard/autofill behavior.

## 4. Final authentication architecture

- Register with Google: `/register` -> `/auth/google` -> Supabase Google OAuth -> `/auth/callback` -> official cookie-backed Supabase session -> `getPostAuthRoute()`.
- Register with email: `signUp({ email, password })` -> six-digit confirmation OTP screen -> server `verifyOtp` -> require both authoritative Supabase user and session -> `getPostAuthRoute()`.
- Login with Google: the same OAuth entry/callback and provider-neutral post-auth router.
- Login with email/password: `signInWithPassword` -> authoritative user -> `getPostAuthRoute()`. There is no OTP in an ordinary successful login.
- An account explicitly rejected by Supabase as `email_not_confirmed` enters the shared verification-code recovery UI. This is recovery for an unverified registration, not passwordless login.
- Password recovery and supported link/token callbacks remain intact.

## 5. Registration OTP implementation

The OTP is created, delivered, expired, verified, and exchanged for a session entirely by Supabase Auth. PrepDMAT does not generate, persist, hash, log, or compare OTP values and does not use the service role to verify them.

The server action validates a normalized bounded email and exactly six ASCII numeric digits before the limiter or provider call. It calls Supabase, requires both `data.user` and `data.session`, refreshes the root auth layout, and routes with `getPostAuthRoute`. Invalid and expired tokens share one safe response. Provider/rate-limit failures do not expose raw details.

The shared input is one accessible text input with `autocomplete="one-time-code"`, numeric input mode, a six-character maximum, paste/autofill support, native Enter submission, visible focus, structural disabling, and pending copy. Synchronous single-flight guards plus disabled pending buttons protect Create account, Verify, Resend, and Google starts from repeated clicks.

## 6. Exact Supabase OTP API/type

Installed versions audited:

- `@supabase/supabase-js` 2.100.1
- `@supabase/ssr` 0.10.0

The installed `VerifyEmailOtpParams` contract accepts `email`, `token`, and `EmailOtpType`; that union includes `signup`. Because the token is produced by `auth.signUp`, verification uses:

```ts
supabase.auth.verifyOtp({
  email,
  token,
  type: "signup",
})
```

This is an official Supabase session-producing call. See the Supabase `verifyOtp` reference and email-template guide:

- https://supabase.com/docs/reference/javascript/auth-verifyotp
- https://supabase.com/docs/guides/auth/auth-email-templates

## 7. Polling/listeners removed

The registration-only verification monitor and its tests were deleted. The OTP flow has no auth-state subscription, focus listener, visibility listener, eight-second polling loop, two-minute polling timeout, cross-device session-transfer assumption, or client-created Supabase browser instance. The only timer left in email verification is the resend countdown, which is explicitly UX-only.

## 8. Existing-user compatibility

- Verified email/password users still sign in directly with their password and receive no login OTP.
- Unverified legacy email users get the shared verification-code recovery path and enumeration-safe resend behavior.
- Existing Google/provider-linked users use the unchanged authoritative Supabase identity/session model.
- Profile creation remains provider-neutral and `on conflict (id) do nothing`; no duplicate profile path was added.
- No `auth.users` row is manually edited.

## 9. Google OAuth root cause and remediation

Several distinct failure stages were previously collapsed into `auth_unavailable`, and Login described them as an automatic sign-in failure even though the student had explicitly selected Google. Specifically, Google client construction/network startup failures and callback client failures used the same code, while stale/missing PKCE verifier errors in a normal authentication callback were also classified only as unavailable. The Google form had React pending disabling but no synchronous same-form single-flight guard.

Changes:

- same-form double starts are synchronously rejected before a second server action can run;
- the button still immediately shows `Redirecting to Google...` and disables;
- startup/client and provider-temporary failures map to `google_unavailable`;
- stale/missing/bad PKCE verifier failures map to `google_expired` with an explicit retry instruction;
- consent cancellation remains `oauth_cancelled`;
- other safe provider failures remain `oauth_failed`;
- raw provider descriptions are never reflected.

## 10. PKCE findings

`@supabase/ssr` 0.10.0 creates server/browser clients with `flowType: "pkce"`. The installed auth client persists one standard `${storageKey}-code-verifier`; no supported per-flow ID/isolation option was found in the installed public type/API contract, so no experimental flow mechanism was invented.

Overlapping starts from separate tabs can still replace the standard verifier because that storage model belongs to Supabase. PrepDMAT now prevents repeat starts from the same rendered action and converts a stale verifier into a clear, safe retry path. Deployment must keep one canonical app host and exact callback allowlists to avoid cookie/host mismatch.

## 11. Callback behavior

- An existing valid session routes immediately through `getPostAuthRoute` and does not consume a callback code again.
- A valid bounded code is exchanged once.
- A successful exchange routes without re-exchange.
- Refresh/duplicate callback with an existing session routes normally.
- Cancellation, stale verifier, temporary provider failure, and other provider failure are distinct safe outcomes.
- No caller-controlled redirect destination is read.
- Email-verification/recovery token-hash callback support remains for legitimate legacy/fallback link flows.

## 12. Rate limits

No existing threshold was weakened or changed.

- Signup: global 100/minute; account 10/hour; IP 10/hour.
- New email OTP verification scope: global 300/minute; account 10/15 minutes; IP 30/15 minutes.
- Resend: global 100/minute; account 10/hour; IP 10/hour, plus the provider limit and a 60-second client countdown.
- Google start: global 300/minute; IP 20/15 minutes.

The database-backed limiter remains fail-closed and hashes operation/kind/subject. OTP verification is limited before contacting Supabase.

## 13. Consent

Email registration consent remains optional and unchecked by default. Only an affirmative checkbox sends `marketing_email_opt_in: true`. OTP verification and login do not modify consent. Google/phone defaults remain false through the existing provider-neutral profile architecture.

## 14. Security impact

The change preserves RLS, database roles, server `auth.getUser`, service-role isolation, fixed callbacks, no-open-redirect behavior, secure cookies, CSP, bounded inputs, enumeration-resistant resend behavior, pseudonymized logging, and authoritative Supabase session requirements. The new path cannot reach onboarding merely because `signUp` returned a user; an official verified session is mandatory.

## 15. Files changed

Production:

- `src/app/auth/actions.ts`
- `src/app/auth/callback/route.ts`
- `src/app/auth/google/route.ts`
- `src/app/login/page.tsx`
- `src/app/register/page.tsx`
- `src/components/auth/auth-form.tsx`
- `src/components/auth/auth-providers.tsx`
- `src/lib/auth/schemas.ts`
- `src/lib/security/rate-limit.ts`
- deleted `src/lib/auth/verification-monitor.ts`

Tests:

- `src/app/auth/actions.test.ts`
- `src/app/auth/callback/route.test.ts`
- `src/app/auth/google/route.test.ts`
- `src/components/auth/auth-providers.test.tsx`
- `src/components/auth/pending-verification-render.test.tsx`
- `src/components/auth/registration-viewport.contract.test.ts`
- `src/lib/auth/auth-contract.test.ts`
- `src/lib/auth/schemas.test.ts`
- `src/lib/security/security-remediation.test.ts`
- deleted `src/lib/auth/verification-monitor.test.ts`

No generator, grading, analytics, assessment, Admin, RLS, or database migration file was changed.

## 16. Login/Register bundle comparison

Measured as raw, uncompressed bytes across each route's unique referenced client entry chunks in the Next.js 16.3.3 production client-reference manifest. These are comparison values, not transfer-size claims.

| Route | Before | After | Delta |
| --- | ---: | ---: | ---: |
| Login | 335,367 B | 334,995 B | -372 B |
| Register | 335,367 B | 334,995 B | -372 B |

No OTP, animation, or auth package was added. Removing browser polling offset the OTP UI additions.

## 17. Tests and verification

- Focused auth/security/viewport run: 9 files, 80 tests passed.
- Full regression: 125 files, 710 tests passed.
- Existing opt-in audit suites: 17 files / 27 tests skipped behind their existing environment gates.
- ESLint: passed.
- TypeScript (`tsc --noEmit`): passed.
- Next.js production build: passed; 34 routes generated/validated.
- `npm audit --audit-level=high`: passed, 0 vulnerabilities.
- Browser viewport execution: unavailable; manual verification required.

## 18. Manual Supabase configuration required

In the production Supabase project:

1. Open Authentication -> Email Templates -> Confirm signup.
2. Set the subject to `Verify your PrepDMAT email`.
3. Replace the primary confirmation-link content with the exact token template below.
4. Keep Email confirmations enabled. Do not enable autoconfirm.
5. Confirm the email OTP expiry and resend/provider limits in Authentication settings.
6. Keep the canonical production Site URL and exact `/auth/callback` allowlist for Google, recovery, email change, and any intentionally retained fallback link.
7. Test registration against the production email provider before release.
8. Keep `NEXT_PUBLIC_PHONE_AUTH_ENABLED=false` in the production deployment. The secure phone implementation remains present but hidden.

## 19. Exact production confirmation email

Subject:

```text
Verify your PrepDMAT email
```

Body:

```html
<h2>Welcome to PrepDMAT.</h2>
<p>Your verification code is:</p>
<p style="font-size: 28px; font-weight: 700; letter-spacing: 0.2em;">{{ .Token }}</p>
<p>Enter this code in PrepDMAT to verify your email and continue.</p>
<p>This code expires soon.</p>
<p>If you didn't create a PrepDMAT account, you can ignore this email.</p>
```

Do not replace `{{ .Token }}` with a literal value. A link is not needed for the primary registration experience. If a genuine fallback link is retained later, it must use the fixed application callback and the supported Supabase token-hash flow; it must not carry a caller-selected destination.

## 20. Remaining live checks

- Apply the email-template change above.
- Verify new email registration, invalid/expired code, resend, refresh, legacy unverified recovery, and post-verification onboarding against staging Supabase.
- Verify first-time and returning Google users, cancellation, provider outage, callback refresh, stale verifier retry, multiple-tab behavior, logout, and canonical-host cookie behavior.
- Execute the full Register viewport matrix in light/dark themes, keyboard-only, password-manager/autofill, paste, and mobile OTP autofill.

Until those provider and visual checks are completed, the release status remains **CODE READY - MANUAL AUTH SETUP REQUIRED**.
