# Changelog

All notable changes to the expo-playbook. Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- `expo-playbook` skill: 22 chapters (`skill/references/00`–`21`), always-on rules (`skill/rules/`) and templates for `CLAUDE.md`, `AGENTS.md` and the canonical config files.
- `expo-audit` skill (`/expo-audit`): a conformance scan (`skill-audit/scripts/audit.mjs`, markdown / `--json` / `--ci` / `--write`) plus judgment checks, writing an actionable report to the app's `docs/audits/`.
- MIT license.
- Markdown convention: never hard-wrap prose (chapter 18, `rules/core.md`), checked by `scripts/check-links.mjs` in this repository and by `/expo-audit` in apps; every playbook document follows it.
- `scripts/install.sh` (links both skills) and `scripts/check-links.mjs` (link, anchor, import and frontmatter checks).
- Positions taken: single `@/` alias; a public UI barrel for screens and hooks with direct paths inside the UI folder; utils as default namespace objects re-exported as `xUtils`; file layout with helpers above their callers and effects before `return`; a relaxed component triad; `styles.ts` default-exporting `StyleSheet.create` or a `createStyles(theme)` factory; strict TypeScript plus four extra flags on new projects; one design-system vocabulary and token naming; English in the repository, with app locales and conversation language declared per project.
