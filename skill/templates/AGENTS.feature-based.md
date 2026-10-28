# AGENTS.md

Instructions for AI coding agents working on **<App Name>**. Human docs live in `README.md` and `docs/`. Claude Code loads `CLAUDE.md`, which imports this file and the expo-playbook rules.

## Project overview

<One paragraph: what the app does, for whom, and what it deliberately is not. If it belongs to a product family, name the sibling repositories and what binds them (cross-project ADRs, shared tokens).>

**Current status:** <phase / version, what is built, what is next>.

## Standards

This project follows the **expo-playbook** (`~/.claude/skills/expo-playbook/`). Everything generic lives there. The sections below hold **only what is specific to this app**, plus the [deviations](#deviations-from-the-playbook) it declares.

## Stack

| Layer | Technology |
| --- | --- |
| Runtime | Expo SDK <NN>, React <NN>, React Native <0.NN> |
| Language | TypeScript (`strict` + playbook extras) |
| Navigation | Expo Router; <N> tabs (ADR-<n>); header model: <native stack header \| headerless `Screen`> |
| Backend / data | <Supabase via `core/supabase` + TanStack Query \| expo-sqlite + Drizzle \| …> |
| Local state | Zustand — session and UI only |
| Forms | react-hook-form + Zod |
| i18n | i18next + expo-localization (<locales>) |
| Monitoring | Sentry, errors only |
| Connectivity | <always online (ADR) \| offline-first> |

## Architecture — feature-based

Playbook chapter 03. Enforced by `npm run check:arch`. This app's features and foundation:

```plaintext
src/
├── app/        routes only, each renders a feature screen
├── shell/      <auth-guard, app-tabs, dialog-host, …>
├── features/   <feature-a>/ <feature-b>/ …
├── shared/     ui/ hooks/ utils/ data/ stores/ types/ mocks/
├── core/       <api, supabase, storage, theme, i18n, session, monitoring, constants>
└── <domain/, db/ — only if the app has them>
```

Feature-to-feature edges allowed today (each recorded in `eslint.arch.config.js`):

| From | To (barrel) | Why |
| --- | --- | --- |
| <feature> | <feature> | <reason> |

| Data | Where |
| --- | --- |
| <server entities> | TanStack Query via `features/<f>/data/<entity>.api.ts`; keys in `<entity>-keys.ts` |
| Session | `core/session` (Zustand) |

## Domain rules

<The invariants that make the product correct, one bullet each, with the module that owns it.>

## Gotchas specific to this app

| Area | Do | Do not |
| --- | --- | --- |
| <area> | <do> | <do not> |

## Commands

```bash
npm run expo:start
<project-specific scripts>
```

## Doc map

Used by keep-docs-in-sync: when you change the left column, update the right one in the same change.

| Change | Update |
| --- | --- |
| A feature's public API or a feature-to-feature edge | this file § Architecture + `eslint.arch.config.js` |
| <schema / API contract> | <doc> |
| <design token values shared with sibling apps> | <workspace tokens doc> |

## Deviations from the playbook

| What differs | Why | Record |
| --- | --- | --- |
| <none yet> | | |

## Security notes

- <who may read what; what monitoring receives; anything that costs money per call>

## Conversation language

Reply to the human in **<language>**. Code, commits and committed docs stay in English.
