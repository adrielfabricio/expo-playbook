# CLAUDE.md

Entry point for Claude Code on **<App Name>**. The operational guide shared with every agent is `AGENTS.md`, imported below. Generic standards come from the **expo-playbook**; this repository documents only what is specific to it.

@AGENTS.md

## Standards (expo-playbook)

@~/.claude/skills/expo-playbook/rules/all.md

The full chapters are in the `expo-playbook` skill — load it before planning or writing code.

## Project rules

<!-- Only rules specific to this app, e.g. a domain invariant that must always load. -->
<!-- @.claude/rules/<rule>.md -->

## Where things live

| Thing | Path |
| --- | --- |
| Agent operational guide | `AGENTS.md` |
| Generic standards | expo-playbook (`~/.claude/skills/expo-playbook/`) |
| This project's decisions | `docs/adr/`, index `docs/architecture-decision-records.md` |
| Reasoning behind the rules | `docs/` |
| Stack skills | `.claude/skills/` (Firebase / Supabase / Drizzle only — Expo skills come from the user-level plugin) |

## Before declaring a change done

```bash
npm run check:lint && npm run format:write
npm run check:types
npm run check:arch      # feature-based apps
npm run test:unit
npm run check:unused
```

Then sync the docs and run the dead-code sweep (playbook rules). Do not commit, push, build for the stores or deploy — hand the commands to the human.

## Conversation language

Reply to the human collaborator in **<language>**. Code, commits, identifiers and committed docs stay in English; in-app copy follows the i18n locales.
