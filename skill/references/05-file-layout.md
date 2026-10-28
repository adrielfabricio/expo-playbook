---
title: "File layout: what goes where inside a file"
chapter: 05
tags: [file-layout, ordering, components, hooks, functions, guards]
applies_to: ["src/**/*.ts", "src/**/*.tsx"]
related: [04-naming-and-files.md, 06-typescript.md, 07-components-and-design-system.md]
last_updated: 2026-10-28
---

# File layout

Two people writing the same file should produce the same shape. A reader opening any module should find the constants where constants live and the `return` at the bottom, without hunting. The always-on version of this chapter is [`rules/file-layout.md`](../rules/file-layout.md).

## Every file: top-level order

| # | Slot | Notes |
| --- | --- | --- |
| 1 | Imports | Packages → `@/…` → relative (`./styles`, `./types`). A blank line between groups. `import type` for type-only imports. |
| 2 | Types and interfaces | The shapes the rest of the file talks about |
| 3 | Constants | Every module-level `const` / `export const`, including lookup tables |
| 4 | Functions | Everything that runs, helpers **above** their first caller |

**A constant never appears below a function.** The one exception is a constant the file builds by calling a helper (a Drizzle table calling `intervalChecks`, a Zod schema calling `blankToUndefined`): the helper is declared first, the constant follows it.

```ts
import { z } from "zod";

import type { Task } from "@/global/types/task";

import type { TaskFormValues } from "./types";

export type DueStatus = "ok" | "due_soon" | "overdue";

export const DEFAULT_LEAD_TIME_DAYS = 15;
const STATUS_ORDER: Record<DueStatus, number> = { overdue: 0, due_soon: 1, ok: 2 };

function daysUntil(date: string, today: string): number {
	// private helper, directly above its first caller
}

export function dueStatus(date: string, today: string): DueStatus {
	// …
}
```

### Private helpers and subcomponents

- A private helper goes **directly above the first function that calls it**, never at the bottom. The file reads top-down: by the time you reach an exported function, everything it leans on is behind you.
- **Subcomponents are the exception.** A component file is named for the component it exports, so that component comes first and the smaller pieces it renders follow it (e.g. `NativePicker`, then `AndroidDialog`, then `IosSheet`).
- A helper that grows past a screenful, or that a second file wants, moves to its own module (usually a `*.utils.ts`).

## Inside a component or hook

Six slots, in this order. Skip empty ones; never reorder the rest.

| # | Slot | What belongs |
| --- | --- | --- |
| 1 | Hooks and refs | `useTranslation`, `useTheme`, `useRouter`, `useRef`, store selectors, this project's own hooks (`useTasks`, `useDialogStore`) |
| 2 | State, memos and derived values | `useState`, `useMemo` (incl. `styles` from a `createStyles` factory), then every value derived from props, state or hooks |
| 3 | Callbacks | `useCallback` — values memoised because they go to a child or a dependency array |
| 4 | Functions | Plain inner functions that **close over props or state**: event handlers (`handlePress`), small helpers that need the render's values |
| 5 | Effects | `useEffect`, `useLayoutEffect` |
| 6 | `return` | JSX (component) or the returned object (hook) |

```tsx
export default function PlanItemRow({ item, onPress }: PlanItemRowProps) {
	const { t } = useTranslation(); // 1 hooks
	const { theme } = useTheme();

	const tone = statusUtils.toneFor(item.due); // 2 derived
	const styles = useMemo(() => createStyles(theme, tone), [theme, tone]);

	const handleLongPress = useCallback(() => onPress(item.id), [item.id, onPress]); // 3

	function handlePress() { // 4
		onPress(item.id);
	}

	useEffect(() => { // 5
		// …
	}, [item.id]);

	if (!item.title) return null; // guard — after every hook

	return ( // 6
		<Touchable onPress={handlePress} onLongPress={handleLongPress}>…</Touchable>
	);
}
```

With the React Compiler enabled, `useCallback`/`useMemo` are optional; keep slot 3 for values that are memoised on purpose (passed to a memoised child, used in a dependency array).

### Guards and early returns

A guard (`return null` for an unloaded query, a `<Redirect />`, a not-found screen) goes **after every hook, effects included**. Hooks cannot run conditionally; a guard above one is how a component calls hooks in a different order between renders.

A guard also narrows: values that depend on what it proved (`if (!task) return null`) sit **after** it, not in slot 2 propped up with a `!`. A component that guards therefore has two groups of variables, one on each side of the guard — that is correct, not sloppy.

### Inner functions vs module helpers

- **Inner (slot 4):** handlers and helpers that need the render's props/state. Declared with `function`, never `const x = () =>`.
- **Module level (above the component):** helpers that need nothing from the render. Give them explicit parameters instead of closing over locals — testable and reusable. Never declare a pure helper inside a component or hook "for proximity".
- Arrow functions only for inline callbacks (`onPress={() => …}`, `.map((x) => …)`, store selectors) and object-attribute functions (Zustand actions). See [06-typescript.md](06-typescript.md#function-style).
- A render-prop such as `renderItem` may be an inline arrow or a named inner function; for lists of memoised rows prefer a module-level row component.

## Applying it

Apply to new files and to files a change already touches substantially. Reordering an existing file is welcome inside a change that touches it, never as a standalone commit — churn costs trust.
