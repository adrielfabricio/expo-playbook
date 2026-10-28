# AGENTS.md

Instructions for AI coding agents working on **<App Name>**. Human docs live in `README.md` and `docs/`. Claude Code loads `CLAUDE.md`, which imports this file and the expo-playbook rules.

## Project overview

<One paragraph: what the app does, for whom, and what it deliberately is not.>

**Current status:** <phase / version, what is built, what is next>.

## Standards

This project follows the **expo-playbook** (`~/.claude/skills/expo-playbook/`). Everything generic — architecture rules, naming, file layout, TypeScript, components, styling, i18n, testing, tooling, releases — lives there. The sections below hold **only what is specific to this app**, plus the [deviations](#deviations-from-the-playbook) it declares.

## Stack

| Layer | Technology |
| --- | --- |
| Runtime | Expo SDK <NN>, React <NN>, React Native <0.NN> |
| Language | TypeScript (`strict`) |
| Navigation | Expo Router; header model: <native stack header \| headerless `Screen`> |
| Data | <Firebase Auth + Firestore \| …> |
| State | Zustand (session, UI, shared realtime subscriptions) |
| Forms | react-hook-form + Zod |
| Lists / images | FlashList v2 / expo-image |
| i18n | i18next + expo-localization (<locales>, default <locale>) |
| Monitoring | Sentry |

## Architecture — layered

Playbook chapter 02. This app's layout:

```plaintext
src/
├── app/            <route groups and stacks of this app>
├── components/     <notable hosts and primitives>
├── hooks/          domain hooks + orchestration hooks
├── stores/         <stores>
├── repositories/   <entities>
├── services/       <clients and external APIs>
├── utils/          <namespaces>
├── global/         theme/, types/, constants/
└── core/i18n/
```

| Data | Where |
| --- | --- |
| <entity read by many screens> | `<name>-store` fed by `use<Name>Sync` in `<Name>Host` |
| <entity owned by one screen> | `use<Entity>` + `onSnapshot` via `repositories/<entity>.ts` |

Paths to the database are centralized in `<file>` (`paths.*`).

## Domain rules

<The invariants that make the product correct. One bullet each, with the module that owns it.>

## Gotchas specific to this app

| Area | Do | Do not |
| --- | --- | --- |
| <area> | <do> | <do not> |

## Commands

```bash
npm run expo:start
<project-specific scripts: imports, migrations, eas wrappers>
```

## Doc map

Used by keep-docs-in-sync: when you change the left column, update the right one in the same change.

| Change | Update |
| --- | --- |
| <external API usage, cache TTL> | `docs/<api>.md` |
| <environments, CI> | `docs/environments-and-cicd.md` |
| <security rules> | `firestore.rules` + `tests/rules/` |

## Deviations from the playbook

| What differs | Why | Record |
| --- | --- | --- |
| <none yet> | | |

## Security notes

- <what is sensitive in this app, who may read what, what monitoring receives>

## Conversation language

Reply to the human in **<language>**. Code, commits and committed docs stay in English.
