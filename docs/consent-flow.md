# Terms and consent flow

## Current implementation

`src/features/consent/documents.ts` is the single source for the supplied Terms
draft (version 1.0), the Privacy Notice and research information. The draft's
organisation, date, contact and link placeholders are preserved; no organisation,
retention period or link has been invented. Material edits must bump the Terms
version. Keep released versions available in the backend's eventual document
registry so audit records can be interpreted.

The project owner explicitly deferred the Privacy Notice during implementation.
For now the required checkbox accepts **Terms only**. A null Privacy Notice is
stored as `privacy: null`, never as acknowledged. Login and other unrelated
features remain accessible after Terms acceptance. Tracking consent stays
unavailable until a real versioned Privacy Notice is configured. Research
consent stays unavailable until Privacy Notice, research information, research
version, defined retention period and authorised recipients are configured.
Do not put bracket placeholders into these configuration fields. Supporting
documents can use inline `text` or an approved HTTPS `url`.

Adding the Privacy Notice later requires acknowledgement even if Terms remain
at version 1.0. Changes to Terms or Privacy versions require fresh acceptance;
the three controls start unchecked on that gate. Research version/retention
changes invalidate research permission without blocking unrelated features.
Document revisions do not automatically grant any optional purpose.

The root protected navigator shows Terms before onboarding/authentication.
After accepting, existing onboarding and login continue normally. Restored
authenticated sessions also pass the version check. Profile → Privacy & consent
→ Terms & consent settings lets users view documents, save optional choices,
and withdraw each purpose. Consent acceptance never requests OS permissions
or starts GPS/BLE. No new tracking, broadcasting, research upload, retention
job, age-verification or exposure-matching feature is implemented here.

## Local scope and persistence

AsyncStorage keeps a single versioned journal per `[backend URL, user ID]`;
the pre-authentication scope uses a null user ID. Each successful save appends
a timestamped snapshot containing Terms and Privacy versions, acceptance dates,
separate purpose decisions, withdrawals, and research information version and
retention disclosure. All consent records explicitly say
`serverPersistence: 'not_implemented'`.

Anonymous acceptance is **not transferred** after login. An account without its
own current local record gets a fresh account-labelled confirmation with all
three boxes unchecked. Account switching remounts the consent controller and
protected UI, immediately invalidating old callbacks. The same account on the
same backend/device restores its own choices. Another device/reinstall requires
acceptance again until server reconciliation is implemented.

Malformed storage fails closed, shows retry, and is not silently overwritten.
Withdrawals stop optional operations synchronously before persistence. Storage
failures show an error and keep optional operations blocked for the current
session; a failed write is not durable and must be retried before closing the
app. Local storage is not a server audit trail, is not encrypted by this change,
and can be removed by uninstalling/clearing application data.

## Existing integration and limits

The repository contains a Django client for `GET/PUT /api/exposure/consent/`
with only `{ "granted": boolean }`. This can represent the existing operational
tracking switch, but cannot store Terms/Privacy versions, distinct matching and
research purposes, or their audit history. No suitable versioned consent endpoint
or Django server source was found in this repository. **Server persistence for
the new consent records is not implemented.** No speculative endpoint is called.

Existing GPS start/capture/upload and BLE scan entry points check the current
account's `ConsentController.canTrack()` and reject missing/disabled consent.
The tracking provider cancels current capture/upload when local consent changes
to disabled and uses the existing tracking controller's persisted pending-off
mechanism to retry legacy operational withdrawal. Existing remote tracking
consent never overrides a local denial. The legacy flag is not evidence that the
new versioned consent journal was saved remotely. New optional consent does not
automatically start the existing collectors.

`canResearch()` is a local eligibility integration point for future research
work; there are no research uploads in the app. A future uploader must also
check server authorisation before every batch and abort on withdrawal. It must
not infer research consent from tracking or Terms acceptance.

Previously uploaded records are never claimed to be deleted. Cross-device
withdrawal and stopping already queued server-side research/matching jobs require
the Django work below. The existing foreground GPS implementation and rolling
elapsed-time local retention remain unchanged; this task does not implement the
draft's future background collection or calendar-day retention job.

## Proposed Django API contract (not an existing endpoint)

Suggested resource: `/api/consents/`. Final naming must be agreed with the backend
team. Use the existing Django session cookie and fresh CSRF mechanism through
`apiFetch`; writes must also use `expectedUserId` and an AbortSignal. The server
must determine the account from its authenticated session, never trust an
arbitrary submitted patient ID, and return the account identity for verification.

### GET

Return the authenticated `user_id`, canonical current decisions and required
document versions, a revision/ETag, server recorded timestamps, and any pending
document reacceptance. Decisions must distinguish Terms acceptance, Privacy
acknowledgement (nullable while explicitly deferred), operational proximity and
health-report matching, and research copying. Include research information
version and the disclosed retention policy identifier/text.

### POST consent event

Accept a unique idempotency key, expected revision, event type (accept/update/
withdraw), client occurrence timestamp, document versions and explicit booleans
for each purpose. Preserve each event in an audit log; return its server ID,
server recorded timestamp, new revision and canonical decisions. A duplicate
idempotency key must not create a duplicate event or change its outcome.

- Terms acceptance must not imply tracking or research consent.
- Validate known documents and required disclosures server-side. Reject research
  grants without configured information and retention. Reject optional grants
  tied to obsolete documents. Withdrawal must work even for an old document.
- Withdrawal must stop future authorised processing/copying, including queued
  work, without claiming deletion of existing records. Define separately how
  previously uploaded data and existing research copies are handled.
- Return 401 for no session, 403 for CSRF/authorisation failures, 409 for revision
  conflicts, and a validation error for unsupported/missing document versions.
- Apply account access controls and the same purpose checks at collection,
  matching, research-copy and doctor-dashboard endpoints. Client guards alone
  cannot enforce server authorisation.

### Future client reconciliation

Fetch canonical account consent after authentication and on foreground/resume.
Do not apply anonymous choices automatically. Do not replace a newer server
withdrawal with an old device grant. Queue account-scoped withdrawal events
offline and keep local optional work blocked until reconciled. On conflicts,
refresh the canonical state; require an explicit new action for a new grant.
Only mark an event synced after an authenticated matching-account response.
Cancel work on logout/account change and never replay events into another account.

## Validation / device acceptance

Automated tests cover first acceptance, declined options, missing research
configuration, local restoration, account/backend separation, required-version
changes, deferred Privacy introduction, research-version changes, withdrawals,
failed/corrupt storage, concurrent saves, and collector consent gates.

Still test on Android first and then iOS:

- Clean install → Terms before onboarding/login; all choices initially unchecked.
- Terms-only continuation while Privacy is deferred; no Location/Bluetooth OS
  prompts. Declining optional choices leaves normal app features available.
- Account A acceptance → logout → account B has its own unchecked confirmation;
  reopening A restores only A's choices.
- Updated required document → reacceptance, including deep links to patient pages.
- Settings accessibility (TalkBack/VoiceOver), large text, safe areas, scrolling,
  light/dark appearance, and external document links when configured.
- With approved test disclosures configured: explicit start is the only path to
  OS permission prompts; withdrawal cancels active capture/scanning/upload and
  remains disabled on restart. Exercise offline legacy withdrawal retries.
- Failed local save must show an error, never a success message. Retry it.
- Actual server consent reconciliation requires the new Django endpoint first.
