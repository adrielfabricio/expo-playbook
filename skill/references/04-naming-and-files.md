---
title: "Naming, files and barrels"
chapter: 04
tags: [naming, kebab-case, files, components, hooks, utils, barrels, tests]
applies_to: ["src/**"]
related: [02-architecture-layered.md, 03-architecture-feature-based.md, 05-file-layout.md, 06-typescript.md]
last_updated: 2026-10-28
---

# Naming, files and barrels

## Files and folders: kebab-case, always

Every file and folder under `src/` is **kebab-case**, matching Expo Router's guidance for route files. Symbols keep their own casing (PascalCase components, camelCase functions). The only exception is i18n locale folders, which are BCP 47 tags (`pt-BR/`, `en-US/`).

| Item | Convention | Example |
| --- | --- | --- |
| Component folder | kebab-case folder, `index.tsx` inside | `task-card/index.tsx` → `TaskCard` |
| Screen (feature-based) | `screens/<name>/index.tsx` | `screens/task-list/` → `TaskListScreen` |
| Route | kebab-case, Expo Router syntax | `settings.tsx`, `[id].tsx`, `(tabs)/`, `+not-found.tsx` |
| Hook | `use-<name>.ts`, named export | `use-task-detail.ts` → `export function useTaskDetail` |
| Store | `<name>-store.ts` | `session-store.ts` → `useSessionStore` |
| Util module | `<name>.utils.ts`, default namespace object | `task.utils.ts` → barrel `taskUtils` |
| Repository (layered) | `<entity>.ts` under `repositories/` | `repositories/tasks.ts` |
| Data module (feature-based) | `<entity>.api.ts` + `<entity>-keys.ts` under `data/` | `data/tasks.api.ts`, `task-keys.ts` |
| Domain types | `<domain>.ts` under `global/types/` or `shared/types/` | `types/task.ts` → `Task`, `Subtask` |
| Constants | `<topic>.ts` under `global/constants/` or `core/constants/` | `constants/locale.ts` |
| Zod schemas | `schema.ts` in the feature, or `<entity>-schema.ts` | `features/tasks/schema.ts` |
| Tests | `__tests__/<module>.test.ts(x)` next to the code | `utils/__tests__/task.utils.test.ts` |
| Platform variant | Metro extension | `app-tabs/index.ios.tsx`, `use-google-sign-in.web.ts` |

Never PascalCase file names (`TaskCard.tsx`). Hooks are files, not folders: `use-x/index.ts` is legacy.

### Symbol naming

- Components: PascalCase, named for what they render (`TaskCard`, not `Card2`).
- Hooks: `use` + PascalCase. Orchestration hooks: `use<Screen>Tab`, `use<Entity>Detail`, `use<Verb><Entity>` (`useNewTask`), `use<Sheet>` (`useMoveTask`).
- Booleans: name the state, `is`/`has`/`can`/`should` prefix (`isOverdue`, `hasLoaded`).
- Handlers: `handle<Event>` inside the component/hook; props that receive them: `on<Event>`.
- Constants: `SCREAMING_SNAKE_CASE` for module-level primitives and lookup tables (`DEFAULT_LEAD_TIME_DAYS`, `SEARCH_PAGE_SIZE`); camelCase for token objects (`spacing`, `colors`).
- Storage keys: namespaced `@<app>:<key>` (or `@<app>/<key>`, pick one per app), all in one constants file.
- Types: PascalCase, no `I` prefix. Props are `<Component>Props`; style props `<Component>StyleProps`.

## Component folder: the relaxed triad

```plaintext
<name-kebab>/
  index.tsx    default export — the component
  styles.ts    optional — `export default StyleSheet.create(...)` (or a createStyles factory)
  types.ts     optional — `export type <Component>Props = …`
```

Split `styles.ts` and `types.ts` out when styles or props are **non-trivial or reused**. A small presentational leaf may keep both inline in `index.tsx`. Never create an empty file to match the template. A component used by a single parent may stay in the parent's file as a subcomponent (declared after the main component, see [05](05-file-layout.md)); once a second file needs it, it gets its own folder.

## Barrels

There are exactly four kinds of `index.ts`, each with a purpose. No other file re-exports.

| Barrel | Where | Who imports it | Rule |
| --- | --- | --- | --- |
| **UI public barrel** | `components/index.ts` (layered) or `shared/ui/index.ts` (feature-based) | Screens and hooks | Lists components consumed outside the folder: `export { default as Button } from "./button";` plus `export type { ButtonProps }`. **Inside the folder, import siblings by direct path** (`@/shared/ui/typography`) — never through the barrel (require cycles). |
| **Utils barrel** | `utils/index.ts` (layered), `shared/utils/index.ts`, `features/<f>/utils/index.ts` | Everyone outside that folder | Only `export { default as fooUtils } from "./foo.utils";`. Never re-exports named helpers or types. Inside the folder, import siblings by direct path. |
| **Feature public API** | `features/<f>/index.ts` | `app/` and other features | Explicit list with a "why public" comment per symbol; never `export *`. See [03](03-architecture-feature-based.md#the-public-api-indexts-is-a-decision). |
| **Module entry point** | A folder that is one module: `core/theme/`, `core/i18n/`, `core/supabase/`, `services/firebase/` | Anyone allowed by the layer rules | Exposes that module's API (`export { colors, spacing } from "./…"`). Not a convenience re-export of unrelated files. |

Register a component in the UI barrel only when something outside the folder consumes it. A component imported only by its siblings stays out of the barrel.

## Utils: default namespace object

Every `*.utils.ts` exports **one default object** of pure functions; the barrel re-exports it under a camelCase `<name>Utils` name. Call sites read as `taskUtils.formatEstimatedCost(…)`.

```ts
// src/utils/task.utils.ts
import type { Task } from "@/global/types/task";

function formatEstimatedCost(cost: number): string {
	// …
}

function toTaskCardProps(task: Task): TaskCardProps {
	// …
}

export default { formatEstimatedCost, toTaskCardProps };

// src/utils/index.ts
export { default as taskUtils } from "./task.utils";
```

Rules:

- Pure functions only: no hooks, no side effects, no React. A function with a side effect that wraps an SDK (toasts, Sentry, mutation runner) is still a namespace module, named for what it does (`toastUtils`, `sentryUtils`, `runMutationUtils`).
- One export style per file: the default object only. No `export function` alongside it, no `export type` from a utils module — shared types go to `types/`.
- Explicit return types on every member.
- **Knip cannot see an unused member of a namespace object.** The dead-code sweep checks members by hand ([`rules/dead-code-sweep.md`](../rules/dead-code-sweep.md)).

## Tests location

Co-located `__tests__/` folders next to the code they cover — never a top-level `tests/` for unit tests. A top-level `tests/` is allowed only for suites that need a different runner configuration (e.g. Firestore security rules against the emulator, `tests/rules/`).
