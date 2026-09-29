# MediTrack authentication setup

## Current state and boundaries

The app implements exactly three onboarding pages, email-or-phone/password login, phone-first patient signup, SMS verification, optional email linking to the same authenticated user, profile completion/recovery, protected patient tabs, and device-local sign-out. No doctor registration, role selector, account merging, password recovery, or medical features are included.

A read-only inspection on 2026-09-28 showed **phone Auth disabled**, email Auth enabled, and email confirmation required. SMS provider configuration, secure email-change settings, password policy and delivery settings could not be inspected with the public key. Remote REST schema discovery returned HTTP 401. No local profile schema/migrations existed before this task. Do not assume the candidate profile schema matches the shared backend.

No reference design image was attached; the implementation follows the written specification using original Ionicons/shape compositions, not final illustration artwork.

## Environment

Create a local ignored `.env` from `.env.example`. Only these public values belong in the mobile client:

```dotenv
EXPO_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_<your-publishable-key>
```

Restart Metro after changing values: `npm.cmd start -- --clear` (Windows) or `npm start -- --clear`.

Missing/invalid configuration leaves onboarding and auth forms previewable, visibly disables submissions, and never simulates login. Sessions use the existing isolated native AsyncStorage adapter; the only additional persisted app preference is the onboarding-completed flag. Registration drafts, optional email, password and verification codes are not written to app storage. Passwords are cleared after submission and are never logged or placed in route parameters.

## Required hosted Auth configuration (team action)

1. Enable phone authentication and keep phone confirmation enabled. Configure a supported SMS provider in the Supabase dashboard with delivery to Sri Lanka and any other supported destination countries. Keep provider secrets in Supabase, never in chat, mobile code, public environment variables or Git.
2. Keep email authentication enabled and require email confirmation. Configure production SMTP/sender settings and check provider domain verification, quotas, spam delivery and account restrictions. The default mail service may restrict recipients and is not a production delivery setup.
3. Keep secure email change enabled. The app handles additional confirmation prompts when an existing email must also confirm. Initial attachment to a phone-only account uses the new email address on the same user.
4. Configure password minimum/complexity and compromised-password checks as appropriate. The form enforces at least eight characters and exact confirmation without trimming; stronger server policies remain authoritative and surface a stronger-password error.
5. Configure signup and resend rate limits, OTP lifetime and **6-digit** SMS/email codes to match these inputs. UI cooldowns are 60 seconds and based on elapsed wall-clock time, but server limits and expiry are always authoritative. Restarting the app does not reset server limits.
6. Review CAPTCHA/abuse protection before production. This task does not implement a CAPTCHA challenge; an enabled project challenge requirement must be integrated before those users can authenticate.

No shared Auth configuration was changed by this task.

## Phone-first account flow

- Normalize mobile numbers with libphonenumber-js. Login defaults local input to Sri Lanka; international input uses `+country code`. Signup has a country selector, defaulting to LK (+94).
- Call `signUp({ phone, password, options: { channel: 'sms', data: { full_name, age_at_registration, gender } } })`. Do not send email in this call or create an additional user.
- Without a session, open SMS verification. Confirm using `verifyOtp({ phone, token, type: 'sms' })`. Resend with `resend({ phone, type: 'sms' })`.
- Correcting a mistyped phone number restarts signup with the non-secret in-memory draft and empty password fields. It does not update/delete the earlier unverified registration or grant access to it. Do not repeatedly create accounts to recover an existing registration; login offers pending phone verification, including after app restart.
- A valid session is required for every patient route. Sessions whose user has no confirmed phone are stopped before patient content. On restoration, the provider validates the cached session against Auth and offers retry on network/storage failure. Expired/revoked sessions are signed out locally.
- Profile setup retries independently; a database/profile failure never requires account recreation.

## Optional email verification (code flow)

After phone verification/profile completion, a supplied optional email opens the authenticated email-completion screen. The user confirms sending it. If the app restarts before this step, use **More → Email verification** and re-enter it. Pending `new_email` state is read from Supabase Auth after restoration.

The screen calls `updateUser({ email })` for the current authenticated user, verifies with `verifyOtp({ email, token, type: 'email_change' })`, and resends with `resend({ email, type: 'email_change' })`. It checks the user ID has not changed and only announces email login after Auth reports the target email confirmed. Email failures are generic and do not reveal whether another account owns the address; no merging or second signup occurs. Users may continue with their phone/password and verify email later.

**Change the Supabase “Change email address” email template** to show the OTP rather than relying on a browser link:

```html
<h2>Verify your MediTrack email</h2>
<p>Return to MediTrack and enter this code:</p>
<p>{{ .Token }}</p>
<p>If you did not request this change, ignore this email.</p>
```

Preserve any team-required text and test both messages under secure email change. The app can accept a subsequent code if the server still reports a pending email. Do not disable secure confirmation to avoid testing this case.

### Redirects and deep links

This implementation deliberately uses the supported in-app OTP flow. It does not consume email confirmation links, access tokens in URLs, or OAuth callbacks, so **no Auth callback redirect is required or implemented**. `detectSessionInUrl` remains false. The existing `meditrack` Expo URL scheme is retained, and protected routes apply to `meditrack://medications` and other patient deep links.

Do not allowlist arbitrary redirects or assume `meditrack://auth/callback` exists. If the team later chooses clickable verification links, implement and review an explicit callback/PKCE flow first, then approve its exact native URL and deployed HTTPS callback in Supabase. Expo Go uses an `exp://` development URL rather than a compiled custom scheme; test the custom scheme on a development build. Keep the dashboard Site URL set to a team-approved HTTPS destination even though this code flow does not use it.

## Review and apply the candidate profile migration

`supabase/migrations/20260928000100_patient_profiles.sql` is **prepared, not applied**. Before applying, the backend owner must inspect the real schema and migrations and decide whether to adapt the app to an existing profile table. The candidate aborts when `public.profiles` or `public.patient_profiles` already exists, rather than replacing team data or policies. Other team-specific table names must be checked manually. If there is an existing table, reconcile its field/RPC names with `src/features/auth/profile.ts` and write a compatible migration instead of bypassing the guard.

For a new schema the candidate defines:

- ID referencing `auth.users.id`, full name, gender, reported age at registration and server timestamp recording that age, plus created/updated timestamps. No inferred birth date, credentials, OTP, email, phone or role column.
- RLS self-select and self-update with `USING` and `WITH CHECK`. Authenticated users may update only name/gender; ID and age/timestamps are immutable through client grants. Anonymous users have no table access.
- `ensure_patient_profile` as a restricted, fixed-search-path security-definer function. It derives the ID from `auth.uid()`, checks the caller's confirmed phone in `auth.users`, validates demographics, and performs insert-on-conflict-do-nothing. It never accepts a user ID or trusted role from the client. The function is executable only by authenticated users.
- The app first reads its own row. If absent, it validates the signup demographics and calls the idempotent function after verification. Missing metadata opens a completion form. This handles no-session signup and retries on the next login without relying on a signup trigger.

Age 1–120 is a prototype input range, not an eligibility or child-consent policy. Demographic metadata remains user-editable and must never authorize doctor/admin privileges.

After team review, apply to local/staging first (Supabase local development requires Docker), then use the team's approved deployment process. Example CLI commands, **not run automatically**:

```sh
npx supabase login
npx supabase link --project-ref <reviewed-project-ref>
npx supabase db push --dry-run
# Only after confirming the target, schema compatibility and approval:
npx supabase db push
```

Verify as two distinct test users and anonymously: each user can select/update only their own permitted fields; changing ID/age/timestamps, direct inserts and anonymous RPC calls fail; the RPC rejects unverified-phone users; repeated calls return the same row; name/gender updates advance updated_at. Verify no trusted-role grants exist. Do not claim RLS is tested from linting SQL.

## Validation and manual acceptance

Run `npm test`, `npm run lint`, `npm run typecheck`, `npm run format:check`, `npx expo install --check`, and `npx expo-doctor`. The tests execute the production pure validation/routing module with Node's test runner using the already-installed TypeScript compiler. No extra test framework is installed.

With configured staging providers and reviewed schema, test:

1. All three pages, swiping/Next, Skip/Get Started, restart persistence and no permissions requested.
2. Invalid fields and focus, Unicode names, local/international phones, independent password toggles, paste/autofill, keyboard, 320px-wide screen, large fonts and screen reader.
3. Phone-only signup, SMS receipt, invalid/expired OTP, resend limits, correction restart and recovery of pending verification after app restart.
4. Phone/password login, expired session, offline restoration retry, session refresh in foreground, sign-out and cleared user cache. Onboarding must not reappear after sign-out.
5. Signup with optional email, delayed email completion, code delivery/expiry, already-used email generic errors, and continuing after a linking failure.
6. Record the test user's Auth ID, then sign in separately with phone/password and verified email/password and confirm the **same ID**. Do not use a public profile lookup for identifiers.
7. Signed-out deep links to every patient tab/email route, restored-session launch, and Android Back after login/sign-out. Root Stack.Protected removes inaccessible routes from navigation history.
8. SQL/RLS isolation tests above and no profile/queries remaining when accounts change.

Real SMS/email delivery, same-user dual-identifier login, database policies, native session lifecycle and Android Back require real service/device testing; they cannot be inferred from successful bundles or unit tests. Phone Auth was disabled at inspection, and no verification messages or users were created during implementation.

Before production: implement account/password recovery, consent/eligibility rules, secure session storage review, abuse prevention/CAPTCHA, email/SMS operational monitoring, data retention/deletion, tested RLS for all clinical tables, and device accessibility/security testing. Heavy clinical/research features remain deferred.

## Official references

- [Supabase signUp](https://supabase.com/docs/reference/javascript/auth-signup)
- [Supabase verifyOtp](https://supabase.com/docs/reference/javascript/auth-verifyotp)
- [Supabase updateUser](https://supabase.com/docs/reference/javascript/auth-updateuser)
- [Supabase resend](https://supabase.com/docs/reference/javascript/auth-resend)
- [Email template OTP variables](https://supabase.com/docs/guides/auth/auth-email-templates)
- [Phone provider configuration](https://supabase.com/docs/guides/auth/phone-login)
- [Expo protected routes](https://docs.expo.dev/router/advanced/protected/)
