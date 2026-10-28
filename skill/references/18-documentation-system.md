---
title: "Documentation system"
chapter: 18
tags: [docs, agents-md, claude-md, adr, frontmatter, changelog, workspace]
applies_to: ["AGENTS.md", "CLAUDE.md", "docs/**", "README.md", ".claude/rules/**"]
related: [00-principles.md, 16-environments-builds-releases.md, 19-agent-workflow.md]
last_updated: 2026-10-28
---

# Documentation system

Generic standards live in **this playbook**. Each repository documents only what is specific to it, and links here. A project never copies a playbook chapter into its own `docs/`.

## What each repository keeps

| File | Holds |
| --- | --- |
| `CLAUDE.md` | Claude-only wiring: `@AGENTS.md`, the playbook import line, project rules (if any), where-things-live table, Definition-of-Done commands. Short. |
| `AGENTS.md` | The operational guide shared with every agent: product overview, **stack table**, architecture choice (layered / feature-based) with the project's actual layout, **domain rules and invariants**, project-specific gotchas, commands, **Deviations** from the playbook, and the **doc map** used by keep-docs-in-sync. |
| `.claude/rules/*.md` | Only rules specific to this project (e.g. a domain invariant that must always load). Generic rules come from the playbook import. |
| `docs/adr/` + index | This project's architectural decisions |
| `docs/` reasoning | Why the rules hold: `architecture.md`, `domain-model.md`, `notifications.md`, `history.md` (what each feature decided and left out), API references for external services, environments/CI |
| `docs/features/<f>.md` | Optional per-feature reference for feature-based apps |
| `CHANGELOG.md`, `docs/release-notes.md` | Chapter 16 |
| `README.md` | Human overview: what it is, setup, scripts, badges |
| `.env.example` | Every env var with a comment |

What leaves the repository after adopting the playbook: generic `docs/standards/*` (file structure, components, styling mechanics, TypeScript, utils, localization mechanics, performance, testing process), generic `engineering-guidelines.md` sections, and copies of generic rules. What stays: anything that names this app's domain, tokens' **values**, ADRs, and declared deviations.

### `AGENTS.md` skeleton

Templates: [`templates/AGENTS.layered.md`](../templates/AGENTS.layered.md), [`templates/AGENTS.feature-based.md`](../templates/AGENTS.feature-based.md). Sections:

1. Project overview (what it is, who it serves, current status)
2. Stack table
3. Standards — "This project follows the expo-playbook (`<path>`); the sections below are only what is specific to this app."
4. Architecture — chosen shape + this app's actual folders and boundaries
5. Domain rules and invariants
6. Project gotchas (Do / Do not table)
7. Commands
8. **Doc map** — `code change → document to update` (consumed by keep-docs-in-sync)
9. **Deviations from the playbook** — what differs, why, and the ADR if any
10. Security notes specific to the app
11. Conversation language

## Frontmatter for docs

Standards-like documents carry YAML frontmatter so agents and tooling can query them:

```yaml
---
title: "Human-readable title"
category: standards | architecture | product | adr
type: guide | reference | index | decision
status: active | draft | deprecated
tags: [comma, separated, topics]
applies_to: [glob/paths/**]
related:
  - docs/path/to/related.md
last_updated: YYYY-MM-DD
---
```

`applies_to` matters most in multi-project workspaces: a document that binds only the Expo app says so (`src/**`).

## Markdown formatting

**Never hard-wrap prose.** Each paragraph, list item and blockquote is one line, however long; the editor's soft wrap handles reading. Markdown renders a single line break as a space, so the rendered page is identical either way — the difference is in editing:

- an edited sentence does not reflow the rest of the paragraph, so diffs show only what changed;
- an agent replacing text matches a passage without reproducing line breaks it cannot see, so edits apply on the first try;
- nobody maintains a column width.

Token cost is the same: a line break costs what the space it replaces costs.

What keeps its own lines: headings, table rows, code blocks, frontmatter, HTML comments, `@` imports in `CLAUDE.md`, and fields meant to sit on separate lines (write those as a list, e.g. `- **Status:** …` / `- **Date:** …`, since consecutive lines render joined).

A project that formats Markdown with Prettier enforces this with `"proseWrap": "never"` (in an `overrides` entry for `*.md`); one that excludes Markdown from Prettier relies on review and `/expo-audit`.

## ADRs

- One decision per file: `docs/adr/adr-NNN-short-kebab-title.md`, numbers monotonic, never reused.
- Sections: **Status** (`Proposed` | `Accepted` | `Superseded` | `Rejected`), **Date**, **Context**, **Decision**, **Consequences**; optional Rationale, Alternatives considered, Supersedes/Superseded by.
- Index in `docs/architecture-decision-records.md` (the single navigation point).
- Write one when a reasonable engineer could have chosen differently; not for the uncontested.
- Never rewrite an accepted ADR: add a dated **implementation note** or a superseding ADR, and mark the old one `Superseded` with a link.
- Product-family workspaces keep **cross-project ADRs** at the workspace root; they outrank project ADRs and are superseded, never quietly diverged from.

Template: [`templates/adr.md`](../templates/adr.md).

## Workspace-level files (multi-repo products)

A folder that holds several repositories of one product is a **map plus a planning layer**, not a repository. It may hold, outside version control:

| File | Purpose |
| --- | --- |
| `CLAUDE.md` / `AGENTS.md` | The map: which repo is what, how they connect, which ships first |
| `BACKLOG.md` | Work items: what, why, decisions |
| `SHIPMENTS.md` | Which item ships in which version, each package's status |
| `PRODUCTION-CHECKLIST.md` | Scripts and manual production steps per version |
| `TODO.md` | What only the human can do (credentials, accounts, artwork, reviews) |
| `docs/tech-debt/<project>.md` | Deferred cleanups with their exit condition |
| `docs/design-system/tokens.md` | Token values shared by sibling apps |
| `.specify/`, `specs/` | Speckit (chapter 19) |

Keep BACKLOG/SHIPMENTS/CHECKLIST in sync: a new backlog item goes to "unversioned" in SHIPMENTS; a suggestion becomes a backlog item only after the human approves it; shipping a version updates all three. Back the workspace folder up — nothing in it is versioned.

## Never in committed docs

Speckit feature IDs (`NNN-slug`), paths under `specs/` or `.specify/`, "migrated in feature …" attributions. Document the shipped convention only.
