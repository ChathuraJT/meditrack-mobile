# MediTrack mobile

University healthcare research app built with Expo, TypeScript, Expo Router, Supabase and StyleSheet. Implemented: three onboarding pages, patient phone/password registration and SMS verification, email-or-phone login, optional same-account email verification, session restoration, protected tabs and sign-out. Medical features remain deferred.

## Setup

Built on Windows using Node 22.14.0 and npm 11.9.0; Node 22.13+ is required. Expo 57, React 19.2.3, React Native 0.86.3 and TypeScript 6 are pinned through the single `package-lock.json`. Use npm only.

```sh
npm ci
npm start
```

PowerShell may block npm.ps1. Use `npm.cmd` / `npx.cmd` without changing system policy:

```powershell
npm.cmd ci
npm.cmd start
```

Copy `.env.example` to ignored `.env` and set the shared Supabase HTTPS URL and publishable key. No server/database credentials belong in the client. Restart Metro after editing. Without configuration, onboarding and forms remain previewable, with network submissions disabled.

**Backend setup is still required for real registration:** phone Auth and SMS delivery, email OTP template/delivery, and a reviewed profile migration. Follow [Auth setup](docs/auth-setup.md). Do not apply the prepared migration to the shared project without schema review. See [shared project setup](docs/supabase-setup.md) for local CLI login/linking.

## Running on a phone

`npm start` starts Metro. Install compatible Expo Go, connect phone and computer to the same network, and scan the QR code. If your Expo Go version does not support SDK 57, use a compatible development build.

- `npm run android`: opens an available Android emulator/device through Metro; requires Android tooling for emulator use and does not compile native code.
- `npm run ios`: opens iOS Simulator through Metro; requires macOS/Xcode and does not compile native code. Windows users can use a physical iPhone with compatible Expo Go.
- `npm run web`: browser preview.

BLE and future integrations with native code outside Expo Go require a development build and real-device testing. The initial auth flow requests no camera, location, Bluetooth or notification permissions. `android/` and `ios/` remain ignored for Expo Continuous Native Generation; revisit this if the team maintains native source manually.

## Structure

```text
src/app/                 Router layouts, onboarding, auth and protected patient routes
src/components/ui/       Shared accessible presentation components
src/theme/               Light theme, system typography, spacing, radii
src/features/auth/       Forms, validation, Auth provider, profile and verification flows
src/features/onboarding/ Exactly three introductory pages
src/features/            Home, medications, recovery, profile presentation
src/lib/                 Nullable Supabase client, session adapter, memory-only query client
src/config/              Direct Expo public environment reads and validation
src/hooks/               Native foreground/background auth refresh lifecycle
src/types/, src/mocks/   Reserved for future shared types/synthetic fixtures; no placeholders
supabase/migrations/     Reviewable candidate profile SQL, not automatically applied
tests/                   Focused validation and launch-decision tests
docs/                    Architecture, setup and verification notes
```

`@/*` resolves to `src/*`. Source routes delegate to feature components. No medical records or location histories are cached locally. Session storage is isolated for future hardening; onboarding completion is the only additional persistent app preference.

## Dependencies

The compatible Expo template/navigation dependencies are retained. Supabase handles Auth/backend requests, URL polyfill supports native URLs, AsyncStorage persists native sessions and onboarding completion, TanStack Query holds profile data in memory, and Ionicons supplies consistent icons. React Hook Form manages forms; Zod and its Hook Form resolver validate fields; libphonenumber-js normalizes phone identifiers. TypeScript, Expo ESLint and Prettier provide development checks. No Redux, Axios, alternate navigator or added UI kit.

## Validation

```sh
npm run lint
npm run typecheck
npm run format:check
npm test
npx expo install --check
npx expo-doctor
npx expo export --platform web
npx expo export --platform android --output-dir dist/android
```

`npm run format` applies formatting. See [verification notes](docs/verification.md) and the [Auth acceptance checklist](docs/auth-setup.md). Bundling does not prove SMS/email delivery, authentication, database security or device behavior.

## Team workflow and scope

Review changes in GitHub Desktop, confirm `.env` is absent, run validation, and commit source plus `package-lock.json` and `.env.example`. Commit and push remain manual; this setup does not change branches or remotes.

Suggested commit: `feat: add patient onboarding and Supabase authentication`.

Symptoms, doctor matching, appointments, doctor-approved prescriptions, adherence, recovery observations, exposure/location, notifications, disease intelligence and laboratory workflows remain future phases. No doctor self-registration or medical feature is included. See [architecture](docs/architecture.md) for boundaries and shared Supabase ownership.
