---
title: "State and data"
chapter: 10
tags: [state, data, tanstack-query, firestore, supabase, sqlite, drizzle, asyncstorage, zustand, repositories]
applies_to: ["src/hooks/**", "src/stores/**", "src/repositories/**", "src/services/**", "src/core/**", "src/shared/data/**", "src/features/*/data/**", "src/db/**"]
related: [01-architecture-overview.md, 02-architecture-layered.md, 03-architecture-feature-based.md, 13-errors-and-observability.md, 14-testing.md]
last_updated: 2026-10-28
---

# State and data

## Where state lives

| Data | Where |
| --- | --- |
| Remote server state (REST, Supabase, any request/response API) | **TanStack Query**, via a data module |
| Realtime Firestore data read by more than one hook | **Zustand store + one sync hook + one host** (shared subscription) |
| Realtime Firestore data owned by one screen | A domain hook with its own `onSnapshot`, through a repository |
| Local database rows (expo-sqlite + Drizzle) | `useLiveQuery` in a feature's `queries.ts`; nothing mirrored |
| Small persisted key/values (preferences, flags) | AsyncStorage through a core client + a repository |
| Session / signed-in user | Zustand `session-store` (fed by the auth listener) |
| UI state that outlives a screen (dialog request, toasts, a one-form draft) | Zustand store in `stores/` or `shared/stores/` |
| Form values | react-hook-form (chapter 11) |
| Modal / sheet open state, local toggles | Component `useState` |

**The one rule behind the table:** a piece of state has exactly one owner. Server state that has a cache (TanStack Query, `useLiveQuery`) is **never mirrored into Zustand** — the cache updates, the store does not, and the screen reads the stale one. The Firestore shared subscription is not an exception: with a raw listener there is no cache, so the store **is** the cache, and nothing else holds a copy.

## The data layer is the only door

- Layered: `src/repositories/` is the only code that touches the database SDK. Paths are centralized (e.g. `paths.task(uid, id)` in `services/firebase/firestore.ts`).
- Feature-based: `src/shared/data/**` and `src/features/*/data/**` (`<entity>.api.ts`). The client is created in `core/<client>/`.
- A lint rule (`no-restricted-imports`) forbids the SDK everywhere else.
- Data modules export queries/mutations (or plain repository functions), never the raw client.
- Rows are mapped to domain types at the boundary (`toTask(row)`, `fromTaskDraft(draft)`); snake_case never leaks past the data module.
- Backend failures are normalized to app error codes at the boundary (an `ApiError` with `code: "network" | "unauthorized" | "forbidden" | "not_found" | "validation" | "conflict" | "rate_limited" | "server" | "unknown"`); screens map codes to i18n keys (chapter 13).

## TanStack Query (remote APIs)

- **Keys are hierarchical and defined once per entity**, most general first, in a `<entity>-keys.ts` beside the data module. Never inline a key literal at a call site. Promote keys to `shared/data` when a second feature consumes them.

  ```ts
  export const taskKeys = {
  	all: ["tasks"] as const,
  	lists: () => [...taskKeys.all, "list"] as const,
  	detail: (taskId: string) => [...taskKeys.all, "detail", taskId] as const,
  	comments: (taskId: string) => [...taskKeys.detail(taskId), "comments"] as const,
  };
  ```

- Ask, for each key, "what should refetch when this changes?" — too broad refetches the world, too narrow leaves stale screens. A mutation whose side effects the hierarchy cannot express (server-generated rows) invalidates those keys explicitly.
- **Mutations invalidate; they do not hand-patch the cache.** `setQueryData` is only for a deliberate optimistic update, and an optimistic update **always** has a rollback in `onError`.
- Query client defaults live in `core/api/query-client.ts`: retry only retryable codes (network, server, an expiring token's `unauthorized`), a modest `staleTime`, `retry: false` on mutations.
- **Native focus:** call `startAppFocusSync()` in the root layout to feed `focusManager` from `AppState` — Query's default focus listener is `window`, which never fires on native.
- An element bound to a query **degrades** when `data` is undefined and keeps a way back (focus refetch, retry); never hide it, or a tab mounted for the whole session never recovers.
- Tests build clients with `createTestQueryClient()` (`gcTime: 0`, `retry: false`) — chapter 14.

## Firestore realtime: shared subscriptions

Use when the data is user-scoped, **more than one hook reads it**, and it is cross-cutting rather than screen-owned. Four pieces:

```plaintext
stores/<name>-store.ts         data + hasLoaded + error + setters + reset
hooks/use-<name>.ts            use<Name>Sync() opens the listener; use<Name>() is the thin reader
components/<name>-host/        mounts the sync hook once, renders null
components/auth-guard/         mounts the host under {user && …}
```

- **`hasLoaded` is mandatory** — without it "not emitted yet" is indistinguishable from "no data".
- **Report listener errors to Sentry**: a rules rejection looks exactly like an empty account.
- **`reset()` on teardown and sign-out**, with `uid` in the effect deps: one account's data never survives into the next.
- **The sync hook is mounted in exactly one place.** Never a listener per caller, never a bespoke subscriber registry (`Set` of callbacks, ref counting, `useSyncExternalStore` in a hook).
- **Consumers that produce an artifact** (export, clipboard, QR) cannot trust a half-loaded store: `const data = isLoading || error ? await fetchOnce(uid) : store`.
- Effects depend on the fields they read, never on the store object.
- **One write, no read.** Writes take a target resolved from the in-memory store by a pure util; repositories only write (`setDoc` / `writeBatch`), never `getDoc` in a write path.
- **No `runTransaction` on single-writer data** — it needs a server round-trip and never settles offline. Use it only where two clients contend for one document.
- Batch writes ≤ 500 operations (chunk at ~400).
- React Native has no IndexedDB: use `memoryLocalCache()` on native (`persistentLocalCache()` only on web) and surface `isOffline` from `snapshot.metadata.fromCache` instead of an empty list.

Security rules for user data: chapter 20 § Firestore rules.

## Local database (expo-sqlite + Drizzle)

- The database is the single source of truth; Zustand holds UI only.
- Reads: `useLiveQuery` in the feature's `queries.ts`, returning `{ …, loaded }`. Writes: `mutations.ts`, inside a transaction when several rows change together.
- Pure derivations live in `domain/` and run on render: **nothing derived is stored** (no status, no due date, no averages) unless an ADR names it as the one stored derivation and its single writer.
- User-data tables carry `id` (UUID v7, device-generated), `created_at`, `updated_at`, `deleted_at`. Content tables are keyed naturally (slug).
- Migrations are forward-only and tested against a populated database (an app may squash to one migration only until its first store release — record that in an ADR).

## AsyncStorage

- A domain-free key/value client in `core/storage/` (JSON parse through a safe helper that returns `null` on garbage); a repository per feature implements the domain contract over it.
- All keys in one constants file, namespaced `@<app>:<key>`.
- Screens never import AsyncStorage; they call a hook, which calls the repository.

## Zustand rules

- `create<T>()((set) => …)` — the curried form; the uncurried one breaks inference.
- Flat state; actions next to the state they change; `reset()` when the state is per-account.
- Read with per-field selectors (`useSessionStore((s) => s.user?.uid)`), never by destructuring the whole store on hot screens.
- Code outside React reads with `useXStore.getState()`.
- Never mirror server state that has a cache (see the rule above).
