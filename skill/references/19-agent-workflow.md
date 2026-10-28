---
title: "Agent workflow: Definition of Done, Speckit, skills"
chapter: 19
tags: [agents, definition-of-done, speckit, skills, plugins, workflow]
applies_to: ["**"]
related: [00-principles.md, 15-tooling-and-config.md, 17-git-and-collaboration.md, 18-documentation-system.md]
last_updated: 2026-10-28
---

# Agent workflow

## Before writing code

1. Read the project's `AGENTS.md` (stack, domain rules, deviations). In a multi-repo workspace, read the workspace map first, then the repository's guide, and work **from inside that repository**.
2. Load this playbook and read the chapters for the area you will touch (SKILL.md § Lookup).
3. If a stack-specific skill applies (Expo Router, `@expo/ui`, Firebase, Supabase, Drizzle, EAS), load it by name before planning against that library — and read the versioned Expo docs for the SDK in use.
4. Ask the human when a requirement is ambiguous or a rule seems to conflict with the task.

## Definition of Done

Run, in this order, from the repository root:

```bash
npm run check:lint      # expo lint — rewrites package.json, so:
npm run format:write    # always after check:lint
npm run check:types
npm run check:arch      # feature-based apps
npm run test:unit
npm run check:unused    # or npx knip; validate every hit before deleting
```

Then:

- **Docs in sync** — would `AGENTS.md`, the project's docs or the playbook mislead the next agent? Fix the canonical document in the same change ([`rules/keep-docs-in-sync.md`](../rules/keep-docs-in-sync.md)).
- **Dead-code sweep** — change-local first, then repo-wide ([`rules/dead-code-sweep.md`](../rules/dead-code-sweep.md)).
- **CHANGELOG** — a change a user or contributor would notice adds a line under `[Unreleased]`.
- **Wrap-up note** — what changed, docs touched, what was removed vs intentionally kept, anything untested on a device, and the exact commit commands for the human (one block per repository).

A failing check is reported with its output, never hidden. A step that was skipped (offline knip, no device for notifications) is said explicitly.

## Conformance audit

`/expo-audit` (skill `expo-audit`) checks a whole app against this playbook: a mechanical scan (`~/.claude/skills/expo-audit/scripts/audit.mjs <dir>`, also `--json`, `--ci`, `--write`), then judgment checks by chapter. It writes `docs/audits/expo-audit-YYYY-MM-DD.md` in the app — one checkbox per issue with the fix, the chapter and every `file:line` — and changes nothing else. Run it before a release, after a large refactor, or when adopting the playbook. Declared deviations in `AGENTS.md` are reported as declared, not as drift.

**Resolving a report:** work the items in order, one per change; confirm each evidence line (they are heuristics), fix, run the Definition of Done, tick the box, and re-run the scan. Large items become their own spec. Whether `docs/audits/` is committed is the project's choice.

## Speckit

Spec-driven work uses GitHub Spec Kit (`specify` CLI, skills `speckit-*`).

| Setup | Where |
| --- | --- |
| Multi-repo product (a workspace folder holding several repositories) | `.specify/` and `specs/` at the **workspace root**, outside every repository; spec paths written with the repository prefix (`apps/mobile/src/…`) |
| Single repository | `.specify/` and `specs/` inside the repository, **gitignored** |

Rules (always-on version: [`rules/speckit-policy.md`](../rules/speckit-policy.md)):

- **No git integration.** Speckit never creates or switches branches, never commits. Feature identity is `.specify/feature.json` (`feature_directory`) and `specs/NNN-slug/`. Git hooks in `.specify/extensions.yml` stay `enabled: false` (or the git extension is removed).
- **Order:** `speckit-constitution` → `speckit-specify` → `speckit-clarify` → `speckit-plan` → `speckit-tasks` → `speckit-implement`, with `speckit-analyze` / `speckit-checklist` / `speckit-converge` as checks along the way.
- **Constitution:** the playbook plus the project's `AGENTS.md` and ADRs play that role. The constitution file points to them instead of restating them; the plan's Constitution Check checks against them.
- **Spec sizing:** one spec per item of the project's build order or backlog. A spec that sprouts sub-features is split, not widened.
- **Implementation** runs the repository's own Definition of Done and always-on rules.
- **Nothing from Speckit leaks** into code, comments, identifiers, config or committed docs.
- Keep the Spec Kit version aligned across workspaces; upgrade it deliberately with the CLI.

## Skills and plugins inventory

Install each skill **once, at the narrowest scope that covers every project that needs it**. Copies of the same skill in several projects drift (two Spec Kit versions already coexist) and multiply context.

| Scope | What | How |
| --- | --- | --- |
| **User (all projects)** | Expo / EAS skills (`expo-router`, `expo-ui`, `building-native-ui`, `expo-upgrade`, `eas-app-stores`, `eas-workflows`, `expo-dev-client`, …) | Plugin `expo@claude-plugins-official` (source `expo/skills`), enabled in `~/.claude/settings.json` |
| User | `claude-md-improver` | Plugin `claude-md-management@claude-plugins-official` |
| User | `react-native-best-practices` (Callstack), `git-commit`, `create-agentsmd`, `create-readme` | Skills CLI, global (`npx skills add <owner/repo> -g`) |
| User | **expo-playbook** (this skill) and **expo-audit** | Symlinks `~/.claude/skills/expo-playbook` and `~/.claude/skills/expo-audit` → the playbook clone (`scripts/install.sh`) |
| **Project (by stack)** | Firebase (`firebase-basics`, `firebase-auth-basics`, `firebase-firestore`, `firebase-security-rules-auditor`, …) | Skills CLI in the project (`skills-lock.json`), only in Firebase apps |
| Project | Supabase (`supabase`, `supabase-postgres-best-practices`) | Skills CLI in the project, or plugin `supabase@claude-plugins-official` in the project's `.claude/settings.json` |
| Project | `drizzle` | Skills CLI in the project, only in apps with a local DB |
| **Workspace** | `speckit-*` | Generated by `specify init` with the engine in `.specify/` |
| Workspace | Site/marketing skills (`frontend-design`, `landing-page-design`, `seo-audit`) | At the root of the workspace that holds the site |

A skill that does not apply to the stack (Firebase skills in a Supabase or SQLite app) is removed, not kept "just in case". The project's `CLAUDE.md` lists which stack skills it relies on.

## Conversation

Reply to the human in the language the project's `AGENTS.md` declares (§ Conversation language). Code, commits, identifiers and committed docs stay in English.
