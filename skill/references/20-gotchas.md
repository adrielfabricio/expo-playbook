---
title: "Library and platform gotchas"
chapter: 20
tags: [gotchas, react-native, expo-router, firebase, supabase, tanstack, flashlist, gestures, reanimated, expo-ui, notifications, dates, eas, sentry, iap]
applies_to: ["src/**", "app.config.ts", "eas.json"]
related: [07-components-and-design-system.md, 09-navigation-expo-router.md, 10-state-and-data.md, 16-environments-builds-releases.md]
last_updated: 2026-10-28
---

# Library and platform gotchas

Each row cost a real bug in one of the apps. Apply the "Do"; never regress to the "Do not". Versions are those in use on 2026-10-28 (Expo SDK 57–58); re-check against versioned docs after an upgrade.

## React Native and Expo core

| Area | Do | Do not |
| --- | --- | --- |
| Conditional JSX | `{count > 0 && <Node />}` | `{count && <Node />}` — renders `0`; a bare number outside `<Text>` crashes on native |
| Safe area | `SafeAreaView` from `react-native-safe-area-context` / `react-native-screens`, inside `Screen` | `SafeAreaView` from `react-native` (deprecated, no-op on Android) |
| Edge-to-edge Android | Content clears system bars through `Screen`'s insets; keyboard via `react-native-keyboard-controller` | Expect the window to resize for the keyboard, or use the removed `androidNavigationBar` |
| `uuid` | `import "react-native-get-random-values";` as the **first** import of any module calling `uuidv4()` | Call `uuidv4()` without the polyfill — throws at runtime |
| Switch | Wrap in `Toggle` with explicit track/thumb colors; give the iOS switch an explicit `alignSelf` in rows | A bare `Switch` (Android tints the thumb with the system accent; iOS sets `flex-start` on itself) |
| TextInput | Spread type tokens **without** `lineHeight` | Pass `lineHeight` (iOS pushes the value above center) |
| Android release | Keep rules via `expo-build-properties` `android.extraProguardRules` | Hand-edit `android/` (generated) or disable R8 |
| iOS 27 SDK | A config plugin adopting the UIScene lifecycle until Expo's template does (remove once it does) | Ship without it — UIKit stops the app at launch before any JS (nothing reaches Sentry) |
| Native modules | New build for any native change (`@expo/ui`, notifications, haptics, store review) | Expect an OTA update or Expo Go to pick it up |
| TypeScript 6 | `types: ["jest"]` (or the runner's) in `tsconfig.json` | Rely on automatic `@types/*` pickup |
| Expo upgrades | `npx expo-doctor` clean, `npx expo install --fix` | Pin a newer package down to silence a mismatch |

## Expo Router

| Do | Do not |
| --- | --- |
| `unstable_settings = { anchor: "(tabs)" }` in the root layout | `initialRouteName` on a `Stack` (replaced in SDK 58) |
| `navigationUtils.safeGoBack(router, fallbackHref)` | `replace("../")` / `href=".."` as "go up" (fails with no history) |
| End a cross-stack flow with `dismissTo(parent)` + `push(target)` | `replace` that leaves the flow in history |
| Custom tab bar items from `state.routeNames` | Map `state.routes` (only visited tabs exist in SDK 58) |
| Navigation APIs from `expo-router` / `expo-router/react-navigation` | Import `@react-navigation/*` directly |
| `web.output: "single"` for local-only web | Switch to `server`/`static` without auditing Firebase/AsyncStorage for SSR |

## Firebase (JS SDK)

| Area | Do | Do not |
| --- | --- | --- |
| Auth persistence | `initializeAuth` + `getReactNativePersistence(AsyncStorage)` | `getAuth()` alone (no session on RN) |
| Google Sign-In | Native `@react-native-google-signin/google-signin` → idToken → `signInWithCredential`; web `expo-auth-session`; `iosUrlScheme` via config plugin; rebuild after plugin changes | `signInWithPopup`; browser OAuth on native Android |
| Apple Sign-In | `expo-apple-authentication` + SHA-256 nonce (`expo-crypto`) → `OAuthProvider("apple.com")` | Omit the nonce |
| Account deletion | Fresh session check → (Apple: reauth + revoke code) → wipe `users/{uid}/**` → `deleteUser` | Delete Auth before data; wipe on a stale session (data gone, account survives) |
| Firestore cache | `memoryLocalCache()` on native, `persistentLocalCache()` on web; surface `isOffline` from `fromCache` | Promise offline reads after a restart; `enableIndexedDbPersistence` |
| Collection groups | Filter by path depth when a subcollection name is reused | Assume `collectionGroup("cards")` hits only one tree |
| Batches | Chunk at ~400 ops (limit 500) | One unbounded batch |
| Security rules | `match /users/{userId}/{collection}/{document=**}`; deploy from the file; test both directions | A bare `{document=**}` under the user (matches the account doc too); edit rules in the console |
| Push (FCM) | Native Firebase config + dev/production build; `expo-notifications` only asks permission, Firebase Messaging owns token and messages | Expect push in Expo Go or the simulator |

## Supabase

| Do | Do not |
| --- | --- |
| Upload an `ArrayBuffer` from `fetch(uri)` | Pass a `Blob` (uploads an empty object and reports success) |
| Confirm sign-up / reset with the e-mail **code** (`verifyOtp`) typed in the app | Send a link (lands on the Site URL; the app has no web origin) |
| Private buckets: store the object key, read with a signed URL | Store a URL or `getPublicUrl` for private data (signed URLs expire) |
| Multi-step writes through an RPC (one transaction) | Two client calls whose partial failure leaves inconsistent rows |
| Retry `unauthorized` once (token refresh race) | Treat every 401 as final |
| Import `@supabase/supabase-js` only in `core/supabase` and `data/*.api.ts` | Reach the client from screens/hooks |

## Data, state, forms

| Area | Do | Do not |
| --- | --- | --- |
| TanStack on native | `startAppFocusSync()` feeding `focusManager` from `AppState` | Rely on the `window` focus listener |
| Optimistic updates | Rollback in `onError` | `setQueryData` without rollback |
| Zustand + TS | `create<T>()((set) => …)` | `create<T>((set) => …)` |
| react-hook-form | `Controller` + `render` | `register()` |
| FlashList v2 | Omit size estimation props; separators via `ItemSeparatorComponent` | `estimatedItemSize`; `gap` on content |
| Drizzle + FTS5 | Re-append the virtual-table statement after regenerating migrations; test asserts it | Trust `drizzle-kit generate` (it cannot express virtual tables) |

## Gestures, animation, `@expo/ui`

| Area | Do | Do not |
| --- | --- | --- |
| Gesture Handler 3 | Hooks `usePanGesture` / `useTapGesture` / `useCompetingGestures` with `"worklet"` callbacks; compete tap with pan; `failOffsetY` for vertical scroll; negative `hitSlop` to leave the edge to swipe-back | The deprecated `Gesture.Pan()` builder in new code; legacy `Swipeable` (use `ReanimatedSwipeable`) |
| Reanimated + React Compiler | `sv.get()` / `sv.set(v)`; start a multi-value change in one `scheduleOnUI`, report back with `scheduleOnRN` | `sv.value = …` outside a worklet (flagged by `react-hooks/immutability`) |
| Bottom sheet (community) | `@expo/ui/community/bottom-sheet` via `AppBottomSheet`, `BottomSheetModalProvider` at the root, `enablePanDownToClose`, snap points from tokens | `@gorhom/bottom-sheet`; custom backdrops; mounting the sheet conditionally |
| Bottom sheet (native `BottomSheet`) | Explicit `snapPoints`; wrap content in `RNHostView` (presented in its own view controller) | Omit snap points (measures RN children wrongly); omit `RNHostView` (no `Pressable` fires) |
| Android native sheet | Two states only (half/full); short content uses `enableDynamicSizing` with a capped scroll | Expect percentage snap points on Android |
| `MenuView` | Trigger is not a touchable; pass the parent's measured width for full-width triggers | Wrap the trigger in a Pressable |

## Local notifications (`expo-notifications`)

| Do | Do not |
| --- | --- |
| Schedule only the ~20 nearest (iOS caps 64) and reschedule on every app open | Schedule everything |
| `setNotificationChannelAsync` before scheduling, on the only scheduling path | Forget it — Android 8+ drops the notification silently |
| Inexact alarms; block `SCHEDULE_EXACT_ALARM` | Request the sensitive exact-alarm permission |
| Ask `POST_NOTIFICATIONS` after the first reminder exists, from a user tap | Ask on the first screen |
| Keep sound on in the foreground handler on Android | `shouldPlaySound: false` (suppresses the banner entirely) |
| Recompute in the foreground; reschedule by a fingerprint that includes a format token | Rely on background tasks; cancel and recreate an unchanged set |
| Test on physical devices (one battery-aggressive Android, one iPhone) | Trust the emulator/simulator |

## Dates and time zones

| Do | Do not |
| --- | --- |
| Parse calendar dates as local (`new Date(\`${d}T00:00:00\`)`) in one dates module | `new Date("2026-08-29")` (UTC midnight = previous day west of UTC) |
| `todayCalendarDate()` / `toCalendarDate(date)` | `toISOString().slice(0, 10)` (lint-blocked outside the dates module) |
| Month arithmetic clamped to month end (`addMonths`) | `Date.UTC(2026, 1, 31)` (rolls into March) |
| Validate by round-tripping parsed parts | `!isNaN(new Date(v))` |
| Read the Android Material picker through UTC parts | Local getters on its result |

## EAS, Sentry, store, IAP

| Do | Do not |
| --- | --- |
| `SENTRY_AUTH_TOKEN` as an EAS `sensitive` variable | `secret` (never reaches local builds; the source-map upload then fails the build) |
| `SENTRY_DISABLE_AUTO_UPLOAD=true` on device-only dev builds | Rely on `SENTRY_ALLOW_FAILURE` (read by nothing in `@sentry/react-native` 7.11) |
| Production `eas` commands through a wrapper that loads the production EAS environment | Plain `eas … --profile production` with a dev `.env`; `eas env:exec` (drops `APP_ENV`, pipes stdio) |
| `owner`/`projectId` written in `app.config.ts` | Read them from `.env` (EAS CLI does not) |
| RevenueCat: App User ID = auth uid; production keys `appl_`/`goog_`; gate through one hook; unknown entitlement keeps current state | `test_` keys in production (fatal); map a failure to "not premium" (locks paying users out); call the SDK from screens; store premium in the database |
| Store review only through the review service's rules | Prompt on launch or from a screen |
| TestFlight / Play internal for IAP QA | Expect IAP in internal `development` builds |
