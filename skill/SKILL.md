---
name: expo-playbook
description: An opinionated, complete playbook for building Expo / React Native apps — architecture (layered or feature-based), where a new file goes, naming, file layout, TypeScript style, the canonical design-system vocabulary and tokens, Expo Router navigation, data and state (TanStack Query, Firestore, Supabase, SQLite, AsyncStorage, Zustand), forms, i18n, errors and Sentry, testing, tooling, EAS builds and releases, docs, Speckit and the Definition of Done. Use it before planning, writing, reviewing or refactoring code in any Expo app, when deciding where something belongs, when setting up a new app, or when auditing an app against the standards.
---

# expo-playbook

Opinionated standards for Expo apps. It replaces the per-project copies of `docs/standards/`, generic rules and engineering guidelines: a project documents only what is specific to it (stack, domain, ADRs, gotchas, **declared deviations**) and imports this playbook.

## How to use it

1. Read the project's `AGENTS.md` first — its stack, domain rules and **Deviations** section are the only places it may differ from this playbook.
2. Find your task in the lookup table below and read **only** the chapters it names. Chapters are self-contained and link to each other.
3. Precedence: cross-project ADRs → project ADRs → **this playbook** → project `AGENTS.md` → project `docs/` → code. An undeclared difference from the playbook is drift: fix the code.
4. When a chapter does not answer the question, or two rules collide, ask the human — then record the answer here (playbook) or in the project (`AGENTS.md` deviation / ADR).

The always-on rules a project imports (`@~/.claude/skills/expo-playbook/rules/all.md`) are in [`rules/`](rules/): [core](rules/core.md), [file-layout](rules/file-layout.md), [naming-in-english](rules/naming-in-english.md), [keep-docs-in-sync](rules/keep-docs-in-sync.md), [dead-code-sweep](rules/dead-code-sweep.md), [speckit-policy](rules/speckit-policy.md).

## Lookup: I need to…

| I need to… | Read |
| --- | --- |
| Understand the precedence of docs, the language rule, when to promote code | [00-principles](references/00-principles.md) |
| Choose an architecture for a new app, or know the invariants both share | [01-architecture-overview](references/01-architecture-overview.md) |
| Work in a **layered** app: layers, domain vs orchestration hooks, hosts | [02-architecture-layered](references/02-architecture-layered.md) |
| Work in a **feature-based** app: features, `index.ts`, `check:arch`, `domain/` | [03-architecture-feature-based](references/03-architecture-feature-based.md) |
| Decide **where a new file goes** | [02](references/02-architecture-layered.md#layers-and-the-import-rule) or [03](references/03-architecture-feature-based.md#where-does-a-new-file-go) |
| Name a file, folder, hook, store, util; structure a component folder; know which barrels exist | [04-naming-and-files](references/04-naming-and-files.md) |
| Order code inside a file / component / hook; place helpers and guards | [05-file-layout](references/05-file-layout.md) |
| Types, `type` vs `interface`, enums, Zod, function style, comments | [06-typescript](references/06-typescript.md) |
| Build UI: canonical primitives (`Typography`, `Icon`, `Button`, `Screen`, `ScreenState`, `Dialog`…), a11y, lists, images, conditional JSX | [07-components-and-design-system](references/07-components-and-design-system.md) |
| Style: token names, `styles.ts`, dark mode, safe area and insets, shadows | [08-styling-and-theme](references/08-styling-and-theme.md) |
| Routes, stacks, tabs, back navigation, deep links, auth gate | [09-navigation-expo-router](references/09-navigation-expo-router.md) |
| Read or write data; choose between Query, a store, `useLiveQuery`, AsyncStorage; Zustand rules | [10-state-and-data](references/10-state-and-data.md) |
| Build a form, validate input, handle dates and money | [11-forms-and-validation](references/11-forms-and-validation.md) |
| Add or use translated strings, format numbers/dates | [12-i18n](references/12-i18n.md) |
| Handle and report errors, configure Sentry, show toasts vs dialogs | [13-errors-and-observability](references/13-errors-and-observability.md) |
| Write tests, coverage floors, test traps | [14-testing](references/14-testing.md) |
| npm scripts, Prettier, ESLint, tsconfig, knip, dependencies | [15-tooling-and-config](references/15-tooling-and-config.md) |
| `app.config.ts`, env vars, EAS profiles, local builds, versioning, CHANGELOG, release notes | [16-environments-builds-releases](references/16-environments-builds-releases.md) |
| Commits, branches, PRs, multi-repo changes | [17-git-and-collaboration](references/17-git-and-collaboration.md) |
| What `AGENTS.md` / `CLAUDE.md` / `docs/` hold; ADRs; workspace planning files | [18-documentation-system](references/18-documentation-system.md) |
| Definition of Done, Speckit, which skills/plugins to install where | [19-agent-workflow](references/19-agent-workflow.md) |
| A library or platform trap (Firebase, Supabase, FlashList, gestures, `@expo/ui`, notifications, dates, EAS, IAP) | [20-gotchas](references/20-gotchas.md) |
| Start a new app from zero | [21-new-project](references/21-new-project.md) + [`templates/`](templates/) |
| Check whether an app conforms to the playbook | Run the `expo-audit` skill (`/expo-audit`) — read-only scan + report |

## Architecture in one glance

```plaintext
Is the product several capabilities with clear seams, a product family with sibling repos,
or does it need machine-enforced boundaries?
├── yes → feature-based (ch. 03):  app → shell → features → shared → core (+ domain, db)
└── no: one tightly connected domain, many screens reading the same realtime data
        → layered (ch. 02):        app/components → hooks/stores → repositories → services → utils/global/core
Unsure → feature-based. Switching an existing app needs an ADR.
```

Both: `src/app/` is routes only · dependencies flow downward · one door to data · one alias `@/`.

## The non-negotiables (summary of [rules/core.md](rules/core.md))

- Routes only in `src/app/`; feature barrels only (never `export *`); `check:arch` green.
- Data access only in repositories / `data/` modules; never from screens.
- kebab-case files; `use-x.ts` named-export hooks; utils as default namespaces → `xUtils`; UI public barrel for screens/hooks, direct paths inside the UI folder.
- `strict` TS; no `any`, `!`, `enum`; `function` declarations; file layout order (ch. 05).
- `Typography` + i18n for all text; tokens only; `styles.ts` default export; no style objects in render.
- `useDialogStore` + `DialogHost`, never `Alert.alert`; role + label on every interactive element; status never by color alone; `count > 0 &&`.
- Loading / error / empty on every data surface; never a raw backend message.
- No server state mirrored into Zustand; `create<T>()(…)`; RHF only with `Controller`.
- FlashList v2 + memo rows; `expo-image`; Sentry only through the monitoring module, `sendDefaultPii: false`.
- No comments by default; never cite Speckit; English in the repo; chat in the language `AGENTS.md` declares.
- Never commit, push or deploy unless asked; never bump dependencies as a side effect.

## Definition of Done

```bash
npm run check:lint && npm run format:write   # expo lint rewrites package.json
npm run check:types
npm run check:arch                            # feature-based
npm run test:unit
npm run check:unused                          # validate every hit
```

Then: docs in sync, dead-code sweep, `[Unreleased]` changelog line when a user would notice, and a wrap-up with the commit commands for the human. Details: [19-agent-workflow](references/19-agent-workflow.md).

## Templates

[`templates/`](templates/): `CLAUDE.template.md`, `AGENTS.layered.md`, `AGENTS.feature-based.md`, `tsconfig.json`, `eslint.config.js`, `eslint.arch.config.js`, `.prettierrc`, `.prettierignore`, `.editorconfig`, `package.scripts.json`, `app.config.ts`, `eas.json`, `feature-index.ts`, `adr.md`, `CHANGELOG.md`, `release-notes.md`.

## Maintaining the playbook

A generic convention changes **here**, never in a project copy. Edit the chapter, update `last_updated`, keep `rules/` consistent with the chapters, run `node scripts/check-links.mjs` in the playbook repository, and add a line to its `CHANGELOG.md`. A project that cannot follow a rule declares a deviation in its own `AGENTS.md`.
