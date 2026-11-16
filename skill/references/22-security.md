---
title: "Security and app hardening"
chapter: 22
tags: [security, hardening, reverse-engineering, r8, hermes, secure-store, app-integrity, app-attest, play-integrity, rasp, deep-links, supabase, firebase, sentry, owasp-masvs]
applies_to: ["src/**", "app.config.ts", "eas.json", "plugins/**"]
related: [09-navigation-expo-router.md, 10-state-and-data.md, 13-errors-and-observability.md, 16-environments-builds-releases.md, 20-gotchas.md]
last_updated: 2026-11-16
---

# Security and app hardening

The checklist an Expo app is held to before it reaches a store, ordered by what actually stops an attack. Mapped to OWASP MASVS v2 (STORAGE, CRYPTO, AUTH, NETWORK, PLATFORM, CODE, RESILIENCE, PRIVACY).

## The premise: the client is public

Everything in the binary — the JS bundle, `EXPO_PUBLIC_*` values, API keys, endpoints, the logic of the paywall — **will be read by anyone who wants to**. Hermes bytecode and R8 make that slower, never impossible. So:

1. **The real boundary is the server.** Row-level security, function grants, Edge Function auth, server-side entitlement checks. A rule enforced only in the app is a suggestion.
2. **Hardening the client raises the cost** of tampering, cloning and automated abuse. It is the second layer, not a substitute for the first.
3. **Never put a secret in the app.** If a value would let someone do something the app's user could not, it belongs in an Edge Function / backend secret, not in `EXPO_PUBLIC_*`.

## Tier 1 — every app, no exceptions

| MASVS | Do | Do not |
| --- | --- | --- |
| STORAGE | Session tokens and anything sensitive in `expo-secure-store` (Keychain / Keystore). Chunk values over 2 KB (Supabase sessions pass it) | Tokens in AsyncStorage/MMKV unencrypted; a persisted TanStack cache holding health, financial or contact data |
| STORAGE | Android backup rules that **exclude** SecureStore (`expo-secure-store` plugin writes `secure_store_backup_rules`); confirm `allowBackup` and `dataExtractionRules` in the prebuilt manifest | Leave the default full backup — a restored Keystore-encrypted value is garbage and the app crashes or logs out |
| CRYPTO | Random identifiers from `expo-crypto` (`getRandomBytes`, `randomUUID`) | `Math.random()` for anything an attacker could guess (codes, tokens, nonces) |
| AUTH | Supabase/Firebase auth with PKCE for OAuth; `detectSessionInUrl: false` on native; Sign in with Apple token revocation on account deletion | Roll your own password storage; trust a client-side "isPremium"/"isAdmin" flag |
| AUTH | Server-side entitlement (webhook + server check) for paid features | Gate a paid feature only on the SDK's local entitlement cache |
| NETWORK | HTTPS only; leave ATS on (iOS) and cleartext off (Android release) | `NSAllowsArbitraryLoads`, `usesCleartextTraffic: true` outside a dev build |
| PLATFORM | Validate every deep-link parameter (UUID / code regex) before it reaches a query; a deep link **opens a screen**, it never **performs an action** without a tap | Auto-accept an invite, auto-pay, auto-delete from a URL |
| PLATFORM | Universal Links (iOS `associatedDomains`) + verified App Links (Android `intentFilters` with `autoVerify`) for any link that carries a secret (invite codes, magic links) | Rely only on a custom scheme (`myapp://`) for secrets — any app can register the same scheme on Android and receive it |
| PLATFORM | Least permissions: `blockedPermissions` for whatever transitive modules add and the app does not use | Ship `RECORD_AUDIO`, `SYSTEM_ALERT_WINDOW`, broad media read just because a plugin declared them |
| CODE | Release builds with **R8 minify + resource shrink** on Android (`expo-build-properties` → `android.enableMinifyInReleaseBuilds: true`, `android.enableShrinkResourcesInReleaseBuilds: true`), keep rules in `android.extraProguardRules`, and Gradle heap raised to 4 GB through a `withGradleProperties` plugin (R8 runs out of the template's 2 GB); Hermes on (default) | Ship with `minifyEnabled false` (the Expo template default) — every Java/Kotlin class name and string of every native module is readable as-is |
| CODE | Source maps uploaded to Sentry, **not** shipped in the bundle; `npx expo export` output never published | Ship a `.map` file or a dev bundle in a release |
| CODE | `npm audit --omit=dev` / Dependabot in CI; lockfile committed; `npx expo-doctor` clean | Install packages abandoned for years, or ones that add native code you have not read the permissions of |
| PRIVACY | Sentry `sendDefaultPii: false`, log forwarding off, `beforeSend` scrubbing anything with an e-mail/phone shape; no `console.log` of user data in any environment | Attach screenshots / session replay on screens with personal data without saying so in the privacy policy |
| PRIVACY | Public config files (`google-services.json`, `GoogleService-Info.plist`) are fine to commit **only** with their API keys restricted in Google Cloud (Android: package + SHA-1/SHA-256 of the Play signing cert; iOS: bundle id) | Leave a Google API key unrestricted — it is billable and usable from anywhere |

## Tier 2 — apps with money, health, identity or a public API surface

### App integrity (attestation)

Proves to **your server** that a request comes from your unmodified app on a real device. This is the strongest anti-cloning / anti-bot control a mobile app has, because the check happens server-side.

- **`@expo/app-integrity`** wraps Play Integrity (Android, Standard request) and App Attest (iOS). Check its status for the SDK in use — it shipped as alpha.
- Flow: the server issues a nonce → the app requests a token bound to it → an **Edge Function / backend verifies** it with Google / Apple → the server issues a short-lived proof or performs the action.
- Apply it to the expensive or abusable endpoints (sign-up, sending SMS/e-mail/push, redeeming codes, purchases sync), not to every read.
- Play Integrity only issues valid verdicts for Play-distributed installs (internal testing counts); App Attest needs a real device. Keep a server-side kill switch to stop enforcing if the vendor has an outage.
- Firebase App Check is the same idea for Firebase-backed APIs; Supabase has no built-in equivalent, so it is an Edge Function in front of the sensitive RPCs.

### Runtime protection (RASP)

Detects root/jailbreak, hooking (Frida), debuggers, emulators, repackaging and a tampered signature at runtime.

- **freeRASP (Talsec)** has an Expo config plugin and is free; it reports threats to callbacks and optionally to the vendor's dashboard. The paid tier adds kill-on-threat and stronger obfuscation.
- **React to a threat proportionally**: log it (Sentry tag), then degrade — refuse the purchase flow, require re-auth — rather than crashing the app for every rooted device. Blocking all rooted users loses legitimate ones and is bypassed by the attacker anyway.
- Declare it in the privacy policy if the vendor receives device data.

### Certificate pinning

Pin only when the threat model includes a hostile network **and** you control the certificate rotation. Pins against a CDN or a managed backend (Supabase, Firebase) whose certificates rotate without notice will brick the app. If you pin: pin the **public key (SPKI)** of the intermediate, ship a backup pin, and have an OTA-independent escape (expiry date on the pin set). For most apps, Tier 1 + attestation is the better trade.

### Screen and clipboard

- Screens showing one-time codes, recovery keys or card data: block screenshots/recording there (`expo-screen-capture` `usePreventScreenCapture`) and blur the app switcher snapshot on iOS.
- Do not copy secrets to the clipboard without clearing it; Android 13+ shows a toast but other apps may still read it.

### Release hygiene

- Production builds come from EAS with `environment: "production"`; the dev client is never distributed outside internal testers.
- An OTA update (EAS Update) can change all JS: protect the Expo account with 2FA, restrict who can publish to the production channel, and consider **code signing** for updates (`expo-updates` `codeSigningCertificate`).
- `app.config.ts` asserts that no test/sandbox keys reach a production profile (e.g. RevenueCat `test_` keys).

## Backend hand-off (when the app talks to Supabase directly)

The client hardening above is worthless if the database is open. Before release, confirm:

- RLS enabled on **every** table in an exposed schema, with policies scoped `to authenticated`; `anon` revoked from tables it never needs.
- `security definer` functions have `set search_path = ''`, live in a non-exposed schema unless they are an endpoint, and have `EXECUTE` revoked from `public, anon` and granted back explicitly.
- Column grants (not policies) restrict which columns a client may update.
- The Security Advisor is clean (or each remaining lint is explained).
- Auth: CAPTCHA on sign-up / reset / OTP, leaked-password protection, email/OTP rate limits, JWT expiry ≤ 1 h.
- Edge Functions compare shared secrets in constant time and never log them.

## Verification

- `npx expo prebuild --clean` then inspect `AndroidManifest.xml` (backup, cleartext, exported components, permissions) and `Info.plist` (ATS, URL schemes).
- Decompile your own release: `apktool d app.apk` and `jadx` — class names should be obfuscated; `strings` over the Hermes bundle — there must be no secret in it.
- MobSF static scan on the `.apk` / `.ipa` before the first store submission.
- A second test account tries to read and write the first account's data through the REST API directly (`curl` with the publishable key + its own JWT). A policy only tried by the data's owner has not been tried.
