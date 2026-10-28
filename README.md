# expo-playbook

An opinionated, complete playbook for building **Expo / React Native** apps with AI coding agents (Claude Code): architecture (layered or feature-based), naming, file layout, TypeScript, a shared design-system vocabulary, navigation, data and state, forms, i18n, errors, testing, tooling, EAS builds and releases, documentation and the agent workflow.

It ships as two **Claude Code skills** plus a small set of **always-on rules**:

- **`expo-playbook`** — the standards, one chapter per topic, consulted on demand.
- **`expo-audit`** (`/expo-audit`) — scans an app, and writes an actionable conformance report to the app's `docs/audits/` for an agent to work through.
- **Rules** — a compact always-on version that each app imports with one line.

Apps keep only what is specific to them (stack, domain rules, ADRs, gotchas) and declare any deviation from the playbook in their own `AGENTS.md`.

## Layout

```plaintext
expo-playbook/
├── skill/                 → linked as ~/.claude/skills/expo-playbook
│   ├── SKILL.md           quick-lookup index: "I need to… → read chapter NN"
│   ├── references/        00–21, one chapter per topic
│   ├── rules/             always-on rules (all.md imports the rest)
│   └── templates/         CLAUDE/AGENTS templates and canonical config files
├── skill-audit/           → linked as ~/.claude/skills/expo-audit
│   ├── SKILL.md           mechanical scan + judgment checks + report format
│   └── scripts/audit.mjs  conformance scan (markdown, --json, --ci, --write)
└── scripts/
    ├── install.sh         links both skills (idempotent)
    └── check-links.mjs    validates links, anchors, @imports and chapter frontmatter
```

## Requirements

[Claude Code](https://code.claude.com), Node 20+ (for the scan and checks), macOS or Linux.

## Install

```bash
git clone <this-repository-url> expo-playbook
./expo-playbook/scripts/install.sh
```

This links `~/.claude/skills/expo-playbook` and `~/.claude/skills/expo-audit` to the clone, so both skills are available in every Claude Code session on the machine. Keep the clone where it is — the links point to it. `git pull` updates every app at once.

## Use it in an app

1. Add to the app's `CLAUDE.md` (template: `skill/templates/CLAUDE.template.md`):

   ```markdown
   ## Standards (expo-playbook)

   @~/.claude/skills/expo-playbook/rules/all.md
   ```

   The first session asks to approve the external import — approve it. Apps that do not import the line are unaffected: nothing is installed in `~/.claude/rules/`.
2. Fill `AGENTS.md` from `skill/templates/AGENTS.layered.md` or `AGENTS.feature-based.md`, including § Doc map, § Deviations from the playbook and § Conversation language (the language the agent uses with you; the repository itself stays in English).
3. Optionally install the Expo skills once at user level instead of per project (chapter 19).
4. Starting from zero? Follow `skill/references/21-new-project.md`.

## Check an app

Inside the app, in Claude Code:

```text
/expo-audit
```

It runs the scan, confirms the hits by reading the code, adds the judgment checks a script cannot make (thin routes, file layout, three states, docs drift, declared deviations) and writes `docs/audits/expo-audit-YYYY-MM-DD.md`: one checkbox per issue with the fix, the chapter to follow and every `file:line`. Hand that file to an agent ("resolve docs/audits/expo-audit-….md") — the report tells it how to work: one item per change, Definition of Done after each, re-scan to confirm.

The scan alone, without an agent:

```bash
node ~/.claude/skills/expo-audit/scripts/audit.mjs .            # markdown table in the terminal
node ~/.claude/skills/expo-audit/scripts/audit.mjs . --write    # also writes docs/audits/expo-audit-<date>.md
node ~/.claude/skills/expo-audit/scripts/audit.mjs . --json
node ~/.claude/skills/expo-audit/scripts/audit.mjs . --ci       # exit 1 on any ❌
```

## Customize

The playbook is opinionated on purpose. Fork it and change a chapter when your team decides differently; keep `skill/rules/` consistent with the chapters, and run `node scripts/check-links.mjs`. A single app that differs declares it in its own `AGENTS.md` instead.

## License

[MIT](LICENSE)
