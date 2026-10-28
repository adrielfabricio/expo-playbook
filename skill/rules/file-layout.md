> **Always applies.** Everything in a file has one place it belongs. Order is not taste — it is what makes a file skimmable without reading it.

# File layout: what goes where inside a file

## Every file: top-level order

1. **Imports** — packages, then `@/…`, then relative. A blank line between groups.
2. **Types and interfaces.**
3. **Constants** — every module-level `const` / `export const`, lookup tables included.
4. **Functions** — a private helper sits **directly above** its first caller, never at the bottom.

**A constant never appears below a function.** Only exception: a constant built by calling a helper (a Drizzle table, a Zod schema using a refinement helper) follows that helper.

**Subcomponents** are the exception to "helpers above": a component file starts with the component it is named for, and the smaller pieces it renders follow it.

A helper that grows past a screenful, or that a second file wants, moves to its own module.

## Inside a component or hook

| # | Slot | What belongs |
| --- | --- | --- |
| 1 | Hooks and refs | `useTranslation`, `useTheme`, `useRouter`, `useRef`, store selectors, project hooks |
| 2 | State, memos, derived values | `useState`, `useMemo` (incl. `styles` from `createStyles`), values derived from props/state/hooks |
| 3 | Callbacks | `useCallback` — memoised because they go to a child or a dependency array |
| 4 | Functions | Inner `function` handlers and helpers that close over props or state |
| 5 | Effects | `useEffect`, `useLayoutEffect` |
| 6 | `return` | JSX, or the hook's returned object |

- A **guard** (`return null`, `<Redirect />`, not-found) goes after every hook, effects included. Values that depend on what the guard proved go **after** it, not in slot 2 with a `!`.
- A helper that needs nothing from the render is **not** an inner function: it lives at module level, above the component, with explicit parameters.
- Named functions are `function` declarations, never `const handleX = () => {}`.

## Enforcement

- A constant below a function, or a helper at the bottom of a file, is a review blocker.
- Reorder an existing file only inside a change that already touches it — never as its own commit.

Full chapter: expo-playbook `references/05-file-layout.md`.
