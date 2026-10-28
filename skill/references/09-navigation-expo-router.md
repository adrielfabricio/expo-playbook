---
title: "Navigation with Expo Router"
chapter: 09
tags: [navigation, expo-router, routes, tabs, stacks, deep-links, auth-guard]
applies_to: ["src/app/**", "src/shell/**", "src/components/auth-guard/**", "src/components/app-tabs/**"]
related: [01-architecture-overview.md, 02-architecture-layered.md, 03-architecture-feature-based.md, 08-styling-and-theme.md, 20-gotchas.md]
last_updated: 2026-10-28
---

# Navigation with Expo Router

Expo Router is the only navigation library. Import navigation APIs from `expo-router` (or `expo-router/react-navigation`, `expo-router/stack`), never from `@react-navigation/*` directly.

## Route files

- `src/app/` holds **only** route files and `_layout.tsx` files. No components, hooks, types, utilities or styles files besides a route's own minimal `StyleSheet`.
- Route file names are kebab-case; dynamic segments `[id].tsx`, groups `(tabs)/`, catch-all `+not-found.tsx`, system URL hook `+native-intent.tsx`.
- Only a default-exported screen per route file. No business logic.
- Always keep a route matching `/` (usually `(tabs)/index.tsx`).
- `experiments.typedRoutes: true`; prefer typed hrefs (`router.push({ pathname: "/tasks/[id]", params: { id } })`).

What a route does depends on the architecture:

| Layered | Feature-based |
| --- | --- |
| Composes the screen: calls one orchestration hook and renders components from `@/components` | Reads params and renders the feature's screen. ~5 lines. |

## Structure

- **Groups** (`(tabs)`, `(auth)`) organize without changing URLs.
- **Stacks** (`tasks/_layout.tsx`) for pushed screens: details, forms, flows.
- **Modals** as stack presentation options, not separate libraries.
- Notification and deep-link targets are routes: the route shape is part of that contract (renaming `/tasks/[id]` breaks every notification already delivered). Document such routes in `AGENTS.md`.

## Back navigation and links

- **Anchor the tabs under linked screens.** The root layout exports `unstable_settings = { anchor: "(tabs)" }` (Expo Router 58's replacement for `initialRouteName`), so a screen opened by a link has the tabs below it and back/swipe/Android back all work. During in-app navigation pass `{ withAnchor: true }` when the anchor must be loaded below the target.
- **Header back uses a safe go-back:** `canGoBack()` → `back()`, otherwise `replace(backFallbackHref ?? "/")`. Never use `../` or `href=".."` as "go up": expo-router turns them into a plain go-back that fails with no history ("The action 'GO_BACK' was not handled"). Give a screen that can end up alone its natural parent as fallback. Implement it once in `navigationUtils.safeGoBack`.
- **A flow ending on another stack's screen** lands with `router.dismissTo(parent)` + `router.push(target)`, not `replace`, so the flow leaves the history and back from the target shows the parent.
- **`+native-intent.tsx`** (`redirectSystemPath`) rewrites incoming system URLs before any screen or guard runs. It is synchronous, never throws, and reports failures through `sentryUtils`. Payload that must survive sign-in is kept in a store and resumed after authentication.

## Auth gate

- The root layout wraps the navigator in an **auth gate** that keeps the splash/session loading gate and redirects between the auth flow and the app based on the session store. Unauthenticated users may stay only on the auth-flow segments; signed-in users on auth screens go to the app.
- `Stack.Protected` with `guard` + `redirectTo` exists from expo-router 58. Adopting it is a separate, deliberate change that must keep the loading gate and any special cases (e.g. opening `reset-password` while signed in signs the user out first).
- App-wide hosts that need a user (paywall, data sync) mount **inside** the gate, under `{user && …}`.

## Tabs

- **iOS:** `NativeTabs` (`expo-router/native-tabs`) — native glass bar. It overlays content, so lists pay `BOTTOM_TAB_INSET` themselves (chapter 08). Do not set `disableTransparentOnScrollEdge` (flattens the pill) or `tabBarRespectsIMEInsets` (lifts it above the keyboard instead of hiding it).
- **Android / web:** either `NativeTabs` (Material) or a JS `Tabs` with a custom bar (`app-tabs/index.tsx`, iOS in `index.ios.tsx`). A custom bar builds its items from `state.routeNames`, **not** `state.routes` — expo-router 58 creates tabs on first visit, so `state.routes` holds only the visited ones.
- Re-pressing the active tab returns to its root.
- Number of tabs and their order are a product decision recorded in an ADR.

## Header model

Each app picks **one** header model and records it in `AGENTS.md`:

- **Native stack header** for pushed screens (title from the route's options, `headerShadowVisible: false` when the app has no shadows), or
- **Headerless** navigation where `Screen` draws `back`, `title` and `actions` (icons at the top right, the screen-wide actions; what can be done to one item lives on that item's screen, not as buttons inside list cards).

## Web

When the app runs on web only for local development, keep `web.output: "single"` (SDK 58 defaults Expo Router to `server`, which needs an audit of Firebase/AsyncStorage for server rendering). Any web-only styling stays scoped so it never affects native.
