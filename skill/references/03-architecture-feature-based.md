---
title: "Feature-based architecture (by capability)"
chapter: 03
tags: [architecture, feature-based, boundaries, eslint-plugin-boundaries, public-api, domain]
applies_to: ["src/**", "eslint.arch.config.js"]
related: [01-architecture-overview.md, 04-naming-and-files.md, 10-state-and-data.md, 15-tooling-and-config.md]
last_updated: 2026-10-28
---

# Feature-based architecture

`src/` is organized by what the product does, so the tree names the domain (projects, tasks, reminders) rather than the framework. Boundaries are enforced by `npm run check:arch` at error severity.

## Layout

```plaintext
src/
├── app/         Expo Router. Route files and layouts, NOTHING else. Each route ~5 lines.
├── shell/       App-wide composition mounted by the root layout: auth-guard/, app-tabs/,
│                dialog-host/, app-toaster/, push-host/. Never imports a feature.
├── features/    One folder per capability: auth/, projects/, tasks/, …
├── shared/      Used by 2+ features, or design-system primitives:
│   ├── ui/          primitives (public barrel index.ts)
│   ├── hooks/  utils/  data/  stores/  types/  mocks/
├── core/        Foundation, knows nothing above it: api/ (errors, query client), supabase/ or
│                firebase/ (client), storage/, theme/, i18n/, session/, monitoring/, constants/
├── domain/      OPTIONAL — pure TypeScript rules shared by features (no React, no DB, no Expo)
├── db/          OPTIONAL — local database schema, migrations, seed (Drizzle + expo-sqlite)
└── types/       Ambient .d.ts only
```

`domain/` and `db/` exist only in apps whose core is local rules over a local database. Without them, pure rules live in the owning feature's `utils/`.

## Dependency direction

`app → shell → features → shared → core` (and `domain`, `db` sit beside `core` as foundation).

| From \ To | app | shell | features | shared | core / domain / db |
| --- | --- | --- | --- | --- | --- |
| `app` | own | yes | **via `index.ts` only** | yes | yes |
| `shell` | never | own | **never** | yes | yes |
| `features` | never | never | own freely; others **via `index.ts` only** | yes | yes |
| `shared` | never | never | never | own | yes |
| `core` | never | never | never | never | own |
| `domain` | never | never | never | never | `domain` only (imports nothing else) |

Also enforced:

- **No import cycles** (`import/no-cycle`). Two features may import each other's barrels without breaking a boundary, and that is still a require cycle — Metro warns on every launch and a module can evaluate to `undefined`. What two features both need moves down to `shared`.
- **No unclassified files** (`boundaries/no-unknown-files`). An element that matches no pattern is exempt from every policy, so a typo in the config makes the gate inert rather than failing.
- **After editing the boundary config, prove it still fails**: add a deliberate violation, confirm `check:arch` reports it, revert. A green run is not evidence.
- **Never silence a boundary inline** (`eslint-disable`). An exception belongs in `eslint.arch.config.js`, where it is reviewable.

Template: [`templates/eslint.arch.config.js`](../templates/eslint.arch.config.js).

## Where does a new file go

Answer in order; the first "yes" wins:

1. **A route?** `src/app/`. It reads params and renders a feature screen. Nothing else.
2. **Mounted once by the root layout and used by no feature?** `src/shell/`.
3. **A client for an external service, a theme token, i18n, session, config, monitoring?** `src/core/`.
4. **A pure rule with no React/DB that several features compute with?** `src/domain/` (if the app has that layer), otherwise the owning feature's `utils/`.
5. **How many features consume it?** Two or more **and** domain-free, or a design-system primitive: `src/shared/`. Exactly one: that feature. Domain knowledge stays in its feature even with two consumers — the other feature imports it through the owner's `index.ts`.

## Feature shape

```plaintext
src/features/tasks/
├── index.ts       public API — the ONLY file other areas may import
├── screens/       one folder per screen, each rendered by exactly one route
│   └── task-list/  index.tsx + styles.ts
├── components/    used only inside this feature
├── hooks/         orchestration and feature hooks
├── data/          the only place in the feature that calls the backend (*.api.ts, keys)
├── utils/         pure helpers (default-namespace modules)
├── schema.ts      Zod schemas for forms and stored rows (optional)
└── __tests__/
```

Create a subfolder only when there is something to put in it. Never create empty `data/` or `stores/` folders to match a template.

## The public API (`index.ts`) is a decision

- List every symbol explicitly. **Never `export *`.**
- Each export carries a one-line comment saying **why it is public** (which consumer needs it). A growing barrel is a signal to read, not a formality.
- Write `index.ts` last, after the feature works.
- Inside the feature, import siblings by **relative path**, never through the feature's own barrel (self-import cycle).
- Tests import internals directly; a test never widens the public API.
- A pure module (`schema.ts`, a `domain/` file) that another feature needs in a test-only context may be imported by path when going through `index.ts` would drag React/native modules into a non-RN test run — record each such edge in `eslint.arch.config.js`.

Template: [`templates/feature-index.ts`](../templates/feature-index.ts).

```ts
// src/features/tasks/index.ts

/** Rendered by app/(tabs)/tasks.tsx. */
export { default as TaskListScreen } from "./screens/task-list";
/** Rendered by app/tasks/[id]/index.tsx. */
export { default as TaskDetailScreen } from "./screens/task-detail";
/** The home dashboard lists the user's open tasks. */
export { useTaskSummaries } from "./hooks/use-task-summaries";
```

## Routes in this architecture

```tsx
// src/app/tasks/[id]/index.tsx
import { useLocalSearchParams } from "expo-router";

import { TaskDetailScreen } from "@/features/tasks";

export default function TaskDetailRoute() {
	const { id } = useLocalSearchParams<{ id: string }>();
	return <TaskDetailScreen taskId={id} />;
}
```

The screen component (in `features/<f>/screens/`) owns composition; its orchestration logic lives in the feature's `hooks/`, following the same two-level split as the layered architecture ([02](02-architecture-layered.md#two-levels-of-hooks--do-not-merge-them)): data hooks from `data/`, orchestration hooks for screens and write-capable sheets.

## Data module rule

Only a data module calls the backend: `src/shared/data/**` or `src/features/*/data/**`. The SDK (`@supabase/supabase-js`, `firebase/*`, `drizzle-orm` client) may be imported only in `core/<client>/` and in those data modules — enforced with `no-restricted-imports`. Details in [10-state-and-data.md](10-state-and-data.md).

## Variant: pure domain + local database

- `domain/` modules import nothing but each other. A reader or executor a domain function needs is **passed in, typed structurally**, so the module stays testable with plain Vitest/Jest.
- `db/` holds `schema.ts`, `migrations/`, `seed/` (content that ships with the app), `client.ts`.
- A feature module that must run against a real database in tests (e.g. a recomputation) takes its executor as an argument and imports no DB client.
- A platform wrapper with a single consumer stays inside that feature (e.g. the only file importing `expo-notifications` is `features/reminders/scheduler.ts`).
- **Open question:** whether `domain/` modules follow the utils namespace convention (`export default { dueDateFor, … }`) or keep named exports. Until decided, existing named exports in `domain/` are accepted; new pure helpers outside `domain/` are `*.utils.ts` namespaces.

## What was deliberately not adopted

- **Feature-Sliced Design's full taxonomy** (`entities/`, `widgets/`, `pages/`): with Expo Router the route is the page, and every "widget" resolves to a primitive or a feature component. FSD's dependency direction and public-API convention are adopted; its slices are not.
- **Per-layer aliases** — see [01](01-architecture-overview.md#invariants-shared-by-both).
- **A barrel over `shared/` as a whole** — `shared/ui/index.ts` is the one public barrel there (chapter 04); `shared/utils/index.ts` exports `*Utils` namespaces; other subfolders are imported by path.
