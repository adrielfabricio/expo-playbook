---
title: "Bootstrapping a new Expo app"
chapter: 21
tags: [bootstrap, new-project, checklist, templates]
applies_to: ["**"]
related: [01-architecture-overview.md, 15-tooling-and-config.md, 16-environments-builds-releases.md, 18-documentation-system.md, 19-agent-workflow.md]
last_updated: 2026-10-28
---

# Bootstrapping a new Expo app

A checklist that takes an empty folder to an app that already follows the playbook. Templates are in [`templates/`](../templates/).

## 1. Decide before scaffolding

- [ ] Architecture: layered or feature-based ([01](01-architecture-overview.md#choosing-a-shape-new-project)) — write it down in `AGENTS.md`.
- [ ] Data source: remote API (TanStack Query), Firestore, Supabase, local SQLite, AsyncStorage only ([10](10-state-and-data.md)).
- [ ] Locales and the default one; whether there is a language preference.
- [ ] Theme modes: light, dark or both (static vs dynamic `styles.ts`, [08](08-styling-and-theme.md)).
- [ ] Header model: native stack header or headerless `Screen` ([09](09-navigation-expo-router.md#header-model)).
- [ ] Single repository or a multi-repo workspace (site, backend, admin) — decides where Speckit and planning files live.

## 2. Scaffold

- [ ] `npx create-expo-app@latest` on the current SDK; move sources under `src/` (`src/app/`).
- [ ] `.nvmrc` (24), `.prettierrc`, `.prettierignore`, `.editorconfig` from the templates.
- [ ] `tsconfig.json` from the template (strict + the four extras, `@/` alias).
- [ ] `eslint.config.js` from the template; feature-based: `eslint.arch.config.js` + `eslint-plugin-boundaries`, `eslint-import-resolver-typescript`; verify `check:arch` fails on a deliberate violation.
- [ ] `package.json` scripts from `templates/package.scripts.json`.
- [ ] `app.config.ts` from the template (identity, `APP_ENV` → `extra.appEnv`, `typedRoutes`, `reactCompiler`, `usesNonExemptEncryption`); `eas.json` from the template; `eas init` to get the project id.
- [ ] `.env.example` (and `.env` gitignored) only if the app has env vars.
- [ ] `.gitignore`: `build/`, `coverage/`, `.env*` except the example, signing material, `specs/` and `.specify/` when Speckit lives in the repo.

## 3. Foundation code

- [ ] Theme folder with the canonical token names ([08](08-styling-and-theme.md#canonical-token-names)) and the navigation theme override.
- [ ] i18n in `src/core/i18n/` with the locale files, typed keys, and the symmetric-keys test ([12](12-i18n.md)).
- [ ] Monitoring: `sentryUtils`, `Sentry.init` with `sendDefaultPii: false`, `environment` from `getAppEnv()` ([13](13-errors-and-observability.md)).
- [ ] Primitives from the canonical vocabulary as the app needs them: `Typography`, `Icon` (+ `GLYPHS`), `Touchable`, `Button`, `Screen`, `ScreenState`, `Dialog` + `useDialogStore` + `DialogHost`, `toastUtils` ([07](07-components-and-design-system.md)).
- [ ] Root layout: fonts + splash gate, `import "@/core/i18n"`, `unstable_settings.anchor`, gesture root, sheet provider, hosts, auth gate if there are accounts, `startAppFocusSync()` with TanStack Query.
- [ ] Data layer door + `no-restricted-imports` for the SDK.
- [ ] Jest (`jest-expo`) with `jest.setup.js` mocks and the `@/` mapper; `createTestQueryClient` if TanStack Query.

## 4. Agent wiring

- [ ] `CLAUDE.md` from the template — includes `@~/.claude/skills/expo-playbook/rules/all.md`. Approve the external import the first time Claude Code asks.
- [ ] `AGENTS.md` from the matching template; fill stack, architecture, doc map, deviations (none yet).
- [ ] Stack skills only (Firebase / Supabase / Drizzle) at project scope; Expo skills come from the user-level plugin ([19](19-agent-workflow.md#skills-and-plugins-inventory)).
- [ ] Speckit (`specify init`) at the right level, git extension disabled; constitution pointing to the playbook + `AGENTS.md`.
- [ ] `docs/adr/` with the index; ADR-001 records the architecture choice and the data source.
- [ ] `CHANGELOG.md` and `docs/release-notes.md` from the templates.

## 5. First green run

```bash
npm run check:lint && npm run format:write && npm run check:types && npm run check:arch && npm run test:unit && npm run check:unused
```

Then hand the human the first commit commands.
