---
title: "Errors and observability"
chapter: 13
tags: [errors, sentry, monitoring, toasts, dialogs, privacy]
applies_to: ["src/**"]
related: [07-components-and-design-system.md, 10-state-and-data.md, 12-i18n.md, 16-environments-builds-releases.md]
last_updated: 2026-10-28
---

# Errors and observability

## User-facing errors

- **Never surface a raw backend, Firebase, Supabase or SDK message.** It leaks internals, is not translated, and is written for an operator. Normalize failures to an app error code at the data boundary (chapter 10) and map codes to i18n keys in the UI.
- Every async operation has an explicit failure path. A rejected promise nothing catches is a crash on native. Fire-and-forget mutations go through a runner (below), never a bare `void promise`.
- Feedback channel by severity:
  - one-off result or a recoverable failure → **toast** (`toastUtils.showError(t("…"))`);
  - an error the user must read, or a failed write outside React → **dialog** via `useDialogStore`;
  - a data surface that failed to load → **`ScreenState kind="error"`** / `SectionState` with retry.
- A failed submit preserves the user's input (chapter 11).

## Sentry

The only Sentry dependency is `@sentry/react-native` (with its Expo plugin, source maps uploaded at build time). **Only the monitoring module imports it**: `src/utils/sentry.utils.ts` (layered) or `src/core/monitoring/` (feature-based), exposing a namespace:

```ts
// sentryUtils — the only place that imports @sentry/react-native
function captureException(error: unknown, context?: { tags?: Record<string, string>; extra?: Record<string, unknown> }): void;
function captureMessage(message: string, context?: …): void;
function captureWarning(message: string, context?: …): void;

export default { captureException, captureMessage, captureWarning };
```

- `captureException` normalizes non-`Error` values (strings, `undefined`) into an `Error` with the original as `cause`.
- Tags group (`{ action: "deleteTask" }`); `extra` carries ids, **never user data**.

### Init

```ts
Sentry.init({
	dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
	enabled: !__DEV__ && Boolean(process.env.EXPO_PUBLIC_SENTRY_DSN),
	environment: getAppEnv(),     // from extra.appEnv via expo-constants (chapter 16)
	sendDefaultPii: false,
});
export default Sentry.wrap(RootLayout);
```

- `sendDefaultPii: false` and **no log forwarding** (`enableLogs` off) unless the published privacy policy says otherwise — turning either on changes that document in the same change. Under privacy laws (GDPR, LGPD, …), stack traces and device model are what error reporting needs; IPs, user ids and records are not.
- `environment` comes from the build's `APP_ENV` (`development` / `preview` / `production`), so internal builds are never tagged as production. `__DEV__` alone loses `preview`.
- Pin note: list `@sentry/react-native` under `expo.install.exclude` when the app runs a newer major than the SDK's bundled pin, so `expo install --fix` does not downgrade it.

## Mutation runner

```ts
// runMutationUtils.run(promise, { action, extra })
function run(promise: Promise<unknown>, context: { action: string; extra?: Record<string, unknown> }): void {
	void promise.catch((error: unknown) => {
		sentryUtils.captureException(error, { tags: { action: context.action }, extra: context.extra });
		useDialogStore.getState().show({ title: i18n.t("errors.mutationTitle"), message: i18n.t("errors.mutationMessage") });
	});
}
```

Use it for user-triggered writes whose UI does not await the result.

## What else reports

- Listener / subscription errors (an empty store from a rules rejection looks like no data).
- `+native-intent` and deep-link parsing failures.
- Warnings for degraded paths that still work (a revocation skipped on a platform without it).

## Logging

No `console.log` of user records, contact data, tokens or codes in any environment. Remove debugging logs before declaring done.
