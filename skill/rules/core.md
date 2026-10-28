> **Always applies.** The non-negotiables of every Expo app, and the Definition of Done.

# expo-playbook core

## Before you write code

1. Read the project's `AGENTS.md`: stack, domain rules, and its **Deviations** section (the only places it is allowed to differ from the playbook).
2. Load the **`expo-playbook` skill** and read the chapter for the area you touch (its `SKILL.md` has the lookup table). Do this before planning, not after.
3. Ask the human when a requirement is ambiguous or a rule conflicts with the task.

Precedence: cross-project ADRs → project ADRs → expo-playbook → project `AGENTS.md` → project `docs/` → code. An undeclared difference from the playbook is drift: fix the code, not the rule.

## Non-negotiables

- `src/app/` holds routes and `_layout` files only. Dependencies flow downward; nothing imports `app/`. Feature-based apps: another feature only through its `index.ts` (never `export *`), and `npm run check:arch` stays green.
- Data access has one door (repositories / `data/` modules). Screens and components never import a backend SDK, AsyncStorage or a repository.
- One alias: `@/` (+ `@/assets/*`). kebab-case files and folders. Hooks `use-x.ts` with a named export. Utils are default-namespace objects re-exported as `xUtils`.
- TypeScript `strict`; no `any`, no `!`, no `enum`; `function` declarations for named functions; arrows only for inline callbacks and object attributes.
- All text through `Typography` + i18n keys (both locale files); no hex, font size or spacing literal outside the theme; `styles.ts` default-exports `StyleSheet.create` (or `createStyles(theme)` for dynamic themes); no style objects created during render.
- Never `Alert.alert` — `useDialogStore` + `DialogHost`. One-off feedback is a toast.
- Interactive elements: `accessibilityRole` + translated `accessibilityLabel`; status never by color alone; touch targets ≥ `MIN_TOUCH_TARGET`.
- Conditional JSX guards non-booleans explicitly (`count > 0 &&`).
- Every data surface handles loading, error and empty; never surface a raw backend message.
- Server state with a cache is never mirrored into Zustand. `create<T>()((set) => …)`.
- react-hook-form only with `Controller`; Zod at trust boundaries only; validation messages are i18n keys.
- Long lists use FlashList v2 (no size-estimation props) with memoised rows. Images use `expo-image`.
- Sentry is imported only by the monitoring module; `sendDefaultPii: false`.
- Comments: none by default; JSDoc in English for a non-obvious constraint only; never cite Speckit artifacts.
- Markdown: never hard-wrap prose — one line per paragraph, list item or blockquote.
- Do not commit, push, tag, build for stores or deploy unless asked — hand over the commands.
- Do not bump a dependency as a side effect; `npx expo install` for Expo packages.

## Definition of Done

```bash
npm run check:lint      # then always:
npm run format:write    # expo lint rewrites package.json with spaces
npm run check:types
npm run check:arch      # feature-based apps
npm run test:unit
npm run check:unused    # knip; validate each hit
```

Then keep the docs in sync, run the dead-code sweep, add an `[Unreleased]` line to `CHANGELOG.md` for anything a user or contributor would notice, and end with a short wrap-up: what changed, docs touched, what was removed vs kept, what is untested on a device, and the commit commands.

Reply to the human in the language `AGENTS.md` declares; code, commits and committed docs stay in English.
