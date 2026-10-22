# Initial location tracking

Open **Map → Manage location tracking** or **Profile → Location & privacy**.

1. Read the consent explanation and turn tracking on. The app requests foreground location permission and saves `{ "granted": true }` to Django `/api/exposure/consent/` using the existing cookie/CSRF API client. The initial enable operation requires a connection.
2. Once enabled, a fresh GPS fix is requested immediately and about once per minute while MediTrack is active. Capture continues across patient screens. Coordinates, actual fix timestamp, accuracy, real data mode and a UUID are stored locally, including when offline.
3. Turning off immediately cancels capture. The app persists a pending withdrawal and sends `{ "granted": false }`. If offline, the screen reports that server withdrawal is pending and retries while the app is running and on the next account session. It never reports an offline withdrawal as confirmed by the server.
4. Backgrounding pauses capture; foregrounding resumes an enabled session. Signing out/unmounting stops capture. A new app/account session starts with local tracking off, even if account consent was previously granted.
5. View saved count, latest coordinates, timestamp and accuracy. With tracking off, use the two-step clear action to delete this account's local locations only.

## Scope and storage

- Foreground only: no background-location service, BLE, uploads or model scoring were added.
- Daily AsyncStorage buckets are scoped by backend URL and user ID; writes are serialized. They avoid a single multi-megabyte Android entry. AsyncStorage is app-local storage, not application-level encrypted storage.
- Records older than 14 days are removed during initialization and periodic maintenance while the app runs. This cannot physically delete files while the OS has terminated the app. Expired records are excluded from displayed summaries. Other local accounts' expired tracking samples are also pruned without returning their data.
- Server consent and OS permission are separate. Permission removal stops recording. OFF retains previous local records unless the user explicitly clears them.
- Approximate/missing GPS fixes and accuracy limitations remain visible. A location is not proof of an encounter or infection. Mocked and stale fixes are not saved as real observations.
- No live consent or location data was written as part of automated development tests.

## Device setup and manual validation

Install dependencies with the project lockfile and rebuild the development client after adding native packages. The Expo location config plugin supplies the iOS permission description and keeps background options disabled. Use a reachable Django host for a physical phone (localhost refers to the phone). Keep the existing session-cookie/CSRF setup. Web location needs HTTPS or localhost; use browser site permissions if blocked.

On Android and iOS, check permission allow/deny, disabled location services, first saved fix, a second fix after one minute, offline capture after enabling, offline OFF and later consent retry, background/foreground, sign-out/account switch, relaunch with tracking off, and clear-local confirmation. Confirm the Django consent value under the logged-in account. Physical-device GPS and authenticated end-to-end behavior require manual validation; automated tests use injected storage, permission, GPS and consent adapters.

Docs consulted: https://docs.expo.dev/versions/v57.0.0/sdk/location/ and https://docs.expo.dev/versions/v57.0.0/sdk/crypto/.

## Verification performed

- Project tests: 33 passing, including 9 new tracking tests.
- TypeScript check: passed. Expo lint: no errors; three pre-existing auth-screen warnings.
- Web bundle: built successfully. Headless Chrome with a mocked session/consent API and overridden GPS verified turning tracking on, consent confirmation, and saving/displaying a location with timestamp and accuracy. Preview images use fabricated coordinates and an isolated browser profile.
- Live authenticated consent writes and physical Android/iOS GPS have not been exercised.
