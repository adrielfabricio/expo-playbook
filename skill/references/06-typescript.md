---
title: "TypeScript, types and code style"
chapter: 06
tags: [typescript, strict, types, zod, enums, functions, comments, nullability]
applies_to: ["src/**", "tsconfig.json"]
related: [04-naming-and-files.md, 05-file-layout.md, 11-forms-and-validation.md, 15-tooling-and-config.md]
last_updated: 2026-10-28
---

# TypeScript and code style

## Compiler settings

- `tsconfig.json` extends `expo/tsconfig.base` with **`strict: true`** — non-negotiable everywhere.
- **New projects** also enable, from the first commit: `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, `noFallthroughCasesInSwitch` (and `forceConsistentCasingInFileNames`). They are cheap on a greenfield codebase and expensive to retrofit.
- **Existing projects** without them record the gap as tech debt and enable them in a dedicated change, never as a side effect.
- `types: ["jest"]` (or the runner's types) is listed explicitly: TypeScript 6 no longer picks up every `@types/*`.

Template: [`templates/tsconfig.json`](../templates/tsconfig.json).

## Hard rules

- **No `any`.** Use `unknown` and narrow. A necessary escape hatch carries a comment saying why, and `@ts-expect-error` (which fails when the error goes away) is always preferred to `@ts-ignore`.
- **No non-null assertion (`!`).** Handle nullability explicitly (`?.`, `??`, a guard).
- **No `enum`.** Use string unions — zero runtime cost, exhaustive in a `switch`. Enforced by an ESLint `no-restricted-syntax` rule on `TSEnumDeclaration` (see chapter 15).
- `import type` for type-only imports.
- Explicit return types on exported functions outside components (utils, repositories, data modules, domain).

## `type` vs `interface`

| Use | Form | Example |
| --- | --- | --- |
| Component props | `type <Component>Props = …` in `types.ts` (or inline for a leaf) | `export type ButtonProps = PressableProps & { variant?: ButtonVariant }` |
| Unions, intersections, mapped/computed types | `type` | `type CardPosition = "main" \| "extra" \| "side"` |
| Domain models and service contracts | `interface` (extendable) — or `type` derived from Zod | `interface Task { … }`, `type Project = z.infer<typeof projectSchema>` |

No `I` prefix on interfaces (`IUser` style is not used). Variants are unions, never stacked booleans (`variant: "danger"`, not `isDanger`); mutually exclusive states are a discriminated union, not several optional booleans:

```ts
type ScreenStateProps =
	| { kind: "loading" }
	| { kind: "error"; message?: string; onRetry?: () => void }
	| { kind: "empty"; message: string; actionLabel?: string; onAction?: () => void };
```

## Where types live

- Shared domain types: `src/global/types/<domain>.ts` (layered) or `src/shared/types/<domain>.ts` (feature-based); a type used by one feature stays in that feature (`features/<f>/types.ts`).
- Utils never export types; they import them from `types/`.
- Asset and i18n ambient declarations: `src/types/*.d.ts`.

## Zod at trust boundaries only

Validate where data enters from somewhere the app does not control:

- backend / external API responses (contracts drift);
- data read back from storage (AsyncStorage JSON, backup files);
- deep-link and notification payloads;
- form input, through `@hookform/resolvers/zod`.

Do **not** validate data that never left the app — Zod on an internal function's arguments is ceremony the type checker already covers. **Derive types from schemas** (`z.infer`), never maintain both by hand. Schemas are module-level constants; their error messages are i18n keys (chapter 11).

## Nullability

Prefer `undefined` for "absent" and reserve `null` for "explicitly cleared" (the meaning backends give it). Do not use both for the same thing in one model. With `exactOptionalPropertyTypes`, spread optional props conditionally (`{...(uri ? { uri } : {})}`) rather than passing `undefined`.

## Function style

- **`function` declarations for every named function** — utils, hooks, components, handlers, helpers. They hoist, read better in stack traces, and keep diffs small as a function grows.
- **Arrow functions only** for inline callbacks (`onPress={() => …}`, `.map`, `setState((prev) => …)`, store selectors, config callbacks) and for object-attribute functions (Zustand actions).
- Never `const handlePress = () => {}` or `const renderHeader = () => …` as a named local.
- Inner vs module-level placement: [05-file-layout.md](05-file-layout.md#inner-functions-vs-module-helpers).

## Comments

**Default to none.** Code that needs a comment to be understood usually needs renaming or splitting first. Write one only for a **non-obvious constraint that would otherwise be re-broken**: a platform rule, a trap in an API, why the obvious alternative fails. When warranted, it is a **JSDoc block in English**, at the top of the module or directly above the exported symbol:

```ts
/**
 * One-sentence summary of what this is.
 *
 * The constraint, and why the obvious alternative fails.
 */
```

Never write: narration of the next lines, history of how the code got here, a restatement of the name, a note on every branch. **Never cite Speckit artifacts** (user stories, `FR-###`, task IDs, `spec.md`, `specs/NNN-…`) in code, comments, identifiers or config: write the comment as if `specs/` did not exist ([`rules/speckit-policy.md`](../rules/speckit-policy.md)).
