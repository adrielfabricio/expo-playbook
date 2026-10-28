---
name: expo-audit
description: Audits an Expo / React Native app against the expo-playbook and writes an actionable report to the project's docs/audits/ — what conforms, what deviates (with file:line evidence), and one checkbox per issue with the fix and the chapter to follow, ready to hand to an agent. Use when asked to check, audit, verify or scan a project's conformance with the standards, before a release, after a large refactor, or when adopting the playbook in an existing app. It never changes source code; the report file is the only thing it writes.
argument-hint: "[project-dir] [--no-write]"
---

# expo-audit

Checks one Expo app against the **expo-playbook** (skill `expo-playbook`) and writes a report another agent can work through. Two passes: a mechanical scan by script, then the judgment checks a script cannot make.

- **Project:** the argument, or the current app root (the folder with `package.json` and `app.config.*` / `app.json`).
- **Output:** `docs/audits/expo-audit-YYYY-MM-DD.md` inside the project (same-day runs overwrite it). With `--no-write`, print the report instead.
- **Never edit source code, config or other docs.** The report file is the only write.

## 1. Mechanical pass

```bash
node ~/.claude/skills/expo-audit/scripts/audit.mjs <project-dir> --write   # writes docs/audits/expo-audit-<date>.md
node ~/.claude/skills/expo-audit/scripts/audit.mjs <project-dir> --json    # all checks and evidence, for you to read
```

It checks config (aliases, strict + extra flags, Prettier, Node, script names, ESLint rules, boundaries, `app.config.ts`, `APP_ENV`), agent wiring (playbook import, Deviations section, copied rules and skills) and code heuristics (`Alert.alert`, `enum`, `any`, arrow-declared functions, hex outside the theme, raw `<Text>`, inline style objects, `FlatList`, raw icon imports, Sentry importers, console logging, Speckit references, per-layer aliases, `I` prefix, styled-components, SDK outside the data layer, `styles.ts` export form, utils namespaces and type exports, hook shape, `src/app/` strays, feature barrels) and docs (hard-wrapped Markdown prose in `AGENTS.md`, `CLAUDE.md`, `README.md`, `CHANGELOG.md`, `docs/`, `.claude/rules/`). The written report already has, per failing check: a checkbox, the fix, the chapter and every evidence line.

Every hit is a **lead, not a verdict**. Open a sample of the evidence and confirm. In the report, strike or annotate false positives (a type-only SDK import, a list inside a bottom sheet, a hex that is vendor branding) so the resolving agent does not "fix" them.

## 2. Judgment pass

Read the project's `AGENTS.md` (stack, domain rules, **§ Deviations**), load the `expo-playbook` skill, and check by sampling 3–5 representative files per item:

| Item | Chapter | How to check |
| --- | --- | --- |
| Routes are thin (feature-based) or compose one orchestration hook (layered); no logic or data access in routes | 02 / 03 / 09 | Read 3 routes of different kinds (tab, detail, form) |
| Files live with their single consumer; `shared/` only with 2+ consumers and domain-free | 03 | Pick 3 files in `shared/`, grep their importers |
| File layout order (imports → types → constants → functions; helpers above callers; hooks → derived → callbacks → handlers → effects → return; guards after hooks) | 05 | Read 2 components and 2 hooks |
| Orchestration hooks return data + handlers, never JSX; sheets call their own hook | 02 | Read 2 orchestration hooks |
| Loading / error / empty on data surfaces; sections have their own state | 07 | Read 2 list screens and 1 detail |
| Dialogs through `useDialogStore` + one host; three-dots open an action sheet; toasts for one-off results | 07 | Read one destructive flow |
| a11y: role + translated label on interactive elements; status not by colour alone | 07 | Read 3 pressable-heavy components |
| Design-system vocabulary and token names | 07 / 08 | List the UI folder, read the theme folder |
| No server state mirrored into Zustand; hierarchical query keys; mutations invalidate; optimistic updates roll back | 10 | Read stores and one data module |
| Forms: `Controller` only, Zod at boundaries, messages as i18n keys | 11 | Read 1 form |
| i18n: locale files hold the same key set; no hardcoded copy | 12 | Compare key sets; spot-check 3 screens |
| Comments: none by default, JSDoc for constraints only, English | 06 | Skim 5 files |
| Docs drift: every path, script and version `AGENTS.md` / `docs/` names exists as stated | 18 | Verify each one |

Run the Definition of Done commands only if the human asks (they are slow, and `check:lint` rewrites `package.json`).

## 3. Complete the report

Append to the written report (do not rewrite the mechanical part):

1. `## Judgment findings` — the same item shape as the mechanical ones (`### J1. …`, a `- [ ] Resolved` checkbox, **Standard** with the chapter path under `~/.claude/skills/expo-playbook/references/`, **Fix**, **Evidence** as `path:line`), ordered by impact.
2. `## Declared deviations` — what § Deviations lists, confirmed as matching the code, so nobody "fixes" it.
3. `## Suggested order` — group items into changes (each small enough for one spec), cheapest first; mark the large ones L.
4. `## Open questions` — anything the playbook does not settle. Ask the human; never invent a rule.

Then reply to the human with a short summary (counts, the three most important items, the report path) in the language `AGENTS.md` declares. Whether `docs/audits/` is committed or gitignored is the project's choice — mention it if the folder is new.

## Using the scan in CI

`node ~/.claude/skills/expo-audit/scripts/audit.mjs . --ci` exits 1 when a check fails. It needs the playbook installed on the machine, so it fits a local pre-release check; inside a repository's own CI, the ESLint rules from the playbook's templates enforce the same things.
