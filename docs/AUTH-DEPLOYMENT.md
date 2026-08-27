# Authentication deployment and staging verification

## Deployment order

1. Apply `supabase/migrations/202608250020_auth_consent.sql` to the classified target Supabase project.
2. Confirm the `profiles` consent columns, constraints, `handle_new_user` trigger function, and existing profile RLS policies.
3. Configure Supabase Auth URL settings and providers before enabling their application flags.
4. Deploy the application with the target-specific public URL and feature flags.
5. Run the staging checks below using disposable email, Google, and phone accounts.

Never place Google client secrets, SMS provider credentials, OTPs, authorization codes, or Supabase service credentials in source control or public environment variables.

## Repository security controls

The application enforces a database-backed fixed-window limit before public auth provider calls and before Practice, Diagnostic, or enabled on-demand Mock generation. Limits are atomic and shared across instances. Identifiers are HMAC-derived before storage; configure a distinct, random `SECURITY_RATE_LIMIT_SECRET` of at least 32 characters in each deployed environment. A missing secret or unavailable limiter fails closed.

`TRUSTED_CLIENT_IP_HEADER` defaults to `none`. Keep that setting unless the hosting edge overwrites the selected header and strips client-supplied copies. On Vercel, confirm the deployed header contract before selecting `x-real-ip` or `x-forwarded-for`; Cloudflare deployments may select `cf-connecting-ip` only after confirming traffic cannot bypass Cloudflare. Account/user/global limits remain active when IP attribution is disabled.

The application proxy creates a fresh request nonce and sends a Content Security Policy without `unsafe-inline` scripts. Inline styles remain allowed for the small set of React-computed progress widths. Supabase SSR cookies preserve the library's authentication semantics while enforcing `Secure` in production, `SameSite=Lax`, and a root path. Browser sessions necessarily expose the access token to the Supabase client; database least privilege and RLS remain the primary authorization boundary.

`FREE_LAUNCH_ACCESS_ENABLED=true` grants application-level access during the free launch without creating or allowing users to manufacture subscription rows. Keep the existing billing schema for a future controlled rollout.

The forward migration chain through `202608270023_fix_security_rate_limit_timestamp.sql` must be applied before deploying this application version. Auth and generation actions depend on the `security_rate_limits` table and corrected `consume_security_rate_limit` RPC. Migration `023` is required even where `022` is already present; it fixes a PostgreSQL `CURRENT_TIME` keyword collision that otherwise makes every valid limiter call fail closed.

## External dashboard controls (manual)

These controls cannot be proven from repository code and must be checked independently in each Supabase/hosting project:

- Enable Supabase Auth CAPTCHA for signup, login, recovery, resend, and OTP surfaces where supported, and verify the corresponding application integration before enforcement.
- Review Supabase Auth email/SMS rate limits, OTP expiry, password policy, leaked-password protection, session duration, refresh-token reuse detection, and bot/abuse alerts.
- Confirm the canonical Site URL and exact redirect allowlist; remove wildcard and obsolete preview redirects.
- Verify RLS is enabled for every exposed table and execute the pgTAP suite against the migrated staging database.
- Confirm the service-role key is server-only, rotated if ever exposed, absent from browser bundles/logs, and restricted to the intended deployment environments.
- Confirm HTTPS/HSTS at the edge, no caching of authenticated HTML, CSP delivery on document responses, and that the chosen trusted IP header is overwritten by the edge.
- Configure log retention/access, provider spend alerts, database alerts, and incident response contacts.
- CAPTCHA, WAF/bot rules, domain verification, SMTP/SMS provider settings, and hosted secret rotation remain external operational controls; the repository does not claim them as implemented.

## Common Supabase Auth URL configuration

- Set Supabase **Site URL** to the canonical production application origin.
- Add exact application callbacks to **Redirect URLs**:
  - `http://localhost:3000/auth/callback?flow=authentication`
  - `http://localhost:3000/auth/callback?flow=recovery`
  - `https://<staging-host>/auth/callback?flow=authentication`
  - `https://<staging-host>/auth/callback?flow=recovery`
  - `https://<production-host>/auth/callback?flow=authentication`
  - `https://<production-host>/auth/callback?flow=recovery`
- Set `NEXT_PUBLIC_APP_URL` to the matching application origin for each deployment.
- Keep email confirmation enabled if verification is required. Configure production SMTP and review Supabase email and resend rate limits.

## Google configuration

1. In Google Cloud / Google Auth Platform, create a Web application OAuth client.
2. Add exact authorized JavaScript origins for local, staging, and production application origins.
3. Add the Supabase project callback shown on the Supabase Google provider page as Google's authorized redirect URI (normally `https://<project-ref>.supabase.co/auth/v1/callback`; local Supabase uses `http://127.0.0.1:54321/auth/v1/callback`).
4. Store the Google Client ID and Client Secret in the Supabase Google provider configuration, not in this repository.
5. Enable the Google provider in Supabase and exercise both first-login and returning-login flows.
6. Only then set `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true` for that application deployment.

The application asks Supabase to start Google authentication, returns to the application callback for the PKCE code exchange, and stores only the Supabase SSR session cookies. It does not request or persist Google API access tokens.

Supabase automatic identity linking normally links a verified Google identity to an existing user with the same verified email. Confirm that the target project's identity-linking settings match this policy. Do not manually merge accounts. Creating email/password credentials after an OAuth account may intentionally produce an obfuscated response and no verification email as an anti-enumeration measure.

## Phone and SMS configuration

1. Enable Phone authentication in the target Supabase project.
2. Configure and fund a supported SMS provider in Supabase; keep provider secrets in Supabase/provider secret storage.
3. Configure sender identity, geographic permissions, delivery monitoring, OTP expiry, resend window, verification limits, and cost alerts.
4. Review CAPTCHA and Supabase Auth rate protections before production traffic.
5. Verify real delivery with representative Indian and other supported numbers.
6. For India, obtain deployment/compliance review for applicable TRAI/DLT registration, templates, sender IDs, and provider requirements. This checklist is not legal certification.
7. Only after delivery and compliance checks pass, set `NEXT_PUBLIC_PHONE_AUTH_ENABLED=true`.

The UI normalizes to E.164, uses a 60-second resend cooldown aligned with Supabase's standard control, and treats OTP use separately from SMS marketing permission. The feature remains hidden while the flag is false.

## Staging checklist

- [ ] Email signup (marketing unchecked) creates one profile with both opt-ins false.
- [ ] Email signup (marketing checked) sets email opt-in and its timestamp only.
- [ ] Confirmation email opens the application callback, establishes a server-recognized session, and reaches onboarding without a second password entry.
- [ ] Resend verification and change-email controls work; invalid, expired, and already-used links show safe recovery copy.
- [ ] Returning email/password login reaches diagnostic resume when active, otherwise the dashboard after onboarding.
- [ ] Forgot-password callback reaches Reset Password; the new password works; logout clears the app session.
- [ ] Google first login creates one student profile and enters the same onboarding flow.
- [ ] Google returning login preserves edited profile fields and reaches the normal returning-user route.
- [ ] A matching verified email uses Supabase's supported identity-linking behavior without duplicate profiles.
- [ ] Google cancellation/provider errors expose no provider token or raw internal error.
- [ ] Phone first login sends a real OTP, accepts a valid code, creates one profile, and enters onboarding.
- [ ] Invalid/expired OTP, duplicate submission, 60-second resend cooldown, rate limit, and provider outage states are safe and understandable.
- [ ] Returning phone login reaches the normal returning-user route and does not require a password.
- [ ] A phone-only user can use onboarding, dashboard, practice, progress, results, and logout without an email.
- [ ] An email/Google user can use the product without a phone.
- [ ] Profile marketing opt-in and opt-out update independently; authentication OTP/service mail remains independent.
- [ ] Anonymous requests to dashboard, practice, tests, progress, results, and onboarding diagnostic redirect to login.
- [ ] Active Practice/Mock actions still appear through the existing dashboard priority model; active diagnostic resumes directly.
- [ ] Check Sign In, Sign Up, Check Email, Phone/OTP, and error states at 320, 375, and 430 px with no horizontal overflow.
- [ ] Repeat the auth screens in Light and Dark themes, using keyboard-only navigation and a screen reader spot check.
- [ ] Apply migrations through `202608270023_fix_security_rate_limit_timestamp.sql`, then run `supabase/tests/rls_security_remediation.test.sql` with pgTAP and retain all 33 assertions.
- [ ] Confirm anonymous and Student sessions cannot read answer keys, explanations, private response snapshots, or other users' records.
- [ ] Confirm a Student cannot create/update/delete a subscription, edit protected profile fields, directly create a report, or impersonate a reviewer.
- [ ] Trigger each auth and generation limit and confirm the action fails safely without a provider call or duplicate generation.
- [ ] Confirm the CSP has a per-request nonce, blocks an injected inline script, permits required application/Supabase traffic, and emits no browser console violations during normal flows.
- [ ] Verify session cookies over HTTPS and confirm logout/recovery/refresh behavior after the cookie hardening change.
- [ ] Confirm `FREE_LAUNCH_ACCESS_ENABLED=true` allows student access without inserting subscription rows.
