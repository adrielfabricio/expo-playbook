---
title: "Principles and source of truth"
chapter: 00
tags: [principles, source-of-truth, docs, language, promotion]
applies_to: ["**"]
related: [01-architecture-overview.md, 18-documentation-system.md, 19-agent-workflow.md]
last_updated: 2026-10-28
---

# Principles and source of truth

The rules every other chapter leans on. If a chapter seems to contradict one of these, the chapter is wrong and gets fixed.

## Source-of-truth order

When two documents disagree, the higher one wins and the lower one is the thing to fix:

1. **Cross-project ADRs** — when a product spans several repositories (e.g. a workspace root with `docs/adr/`), a decision recorded there binds every repository in it.
2. **The project's ADRs** (`docs/adr/`) — architectural decisions specific to one app.
3. **This playbook** — the generic standards for every Expo app.
4. **The project's `AGENTS.md`** — stack, domain rules, project gotchas, and the declared deviations from this playbook.
5. **The project's `docs/`** — reasoning, design, product.
6. **The code itself.**

Two qualifications:

- A project deviates from the playbook only **on purpose and in writing**: an ADR, or a line in `AGENTS.md` § Deviations saying what differs and why. An undeclared difference is drift, not a deviation, and the code is what gets fixed.
- When a document and the live code diverge on a *fact* (a path, a script, a version), trust the code and fix the document in the same change.

## Documentation is part of the change

A change that alters a contract, the folder layout, scripts, env vars, the stack or the architecture updates the matching document **in the same change set**, never as a follow-up. Pure UI polish and behavior-preserving fixes need no doc pass. Prefer a short accurate correction over a rewrite. Full rule: [`rules/keep-docs-in-sync.md`](../rules/keep-docs-in-sync.md).

**A rule goes in `AGENTS.md`; the reasoning behind it goes in `docs/`.** `AGENTS.md` loads into every session and `docs/` is read only when something points there, so a rule moved into `docs/` is a rule an agent can miss. When an `AGENTS.md` section grows an explanation, move the explanation and leave the rule plus a line saying when to read the rest.

## Language boundary

| What | Language |
| --- | --- |
| Code, identifiers, file names, DB tables/columns, enum values, i18n **keys** | English |
| Commits, branches, PRs, `AGENTS.md`, `CLAUDE.md`, `docs/`, ADRs, comments, this playbook | English |
| i18n **values** — the strings a person sees in the app | The app's locales, declared in `AGENTS.md` |
| Text published outside the app for end users: legal pages, store release notes | The app's locales |
| Conversation with the human collaborator | The language `AGENTS.md` declares (§ Conversation language) |

A non-English identifier, or a non-English sentence in a doc or commit, is a review blocker. The one exception: acronyms of national registries and documents keep their own form (e.g. Brazil's `cnh`); where an exact international term exists, use it (`vin`, `plate`). Full rule: [`rules/naming-in-english.md`](../rules/naming-in-english.md).

## Placement follows measured consumption

Code lives with its single consumer. It moves down a layer (to `shared/`, `utils/`, `core/`) when a **second consumer actually imports it**, not when it "feels generic" or "could be reused". Anticipated reuse is how shared folders become junk drawers. Two consumers are necessary but not sufficient: something that carries domain knowledge never goes to a domain-free layer, however many callers it has.

## Small, deliberate, reversible

- **One concern per change.** Do not bump a dependency, reformat a file or rename a symbol as a side effect of unrelated work; record it as tech debt and do it on purpose.
- **Nothing derived is stored** unless a recorded decision says otherwise. Status, totals, averages and due dates are computed on read.
- **Decisions that someone could reasonably have made differently get an ADR.** Uncontested choices do not — an ADR for the obvious dilutes the ones that matter.
- **Never rewrite history.** An accepted ADR gets a dated implementation note or a superseding ADR.

## Ask, do not assume

When a requirement is ambiguous, a rule seems to conflict with the task, or a choice would be hard to reverse, ask the human before acting. Do not commit, push, tag, deploy or publish unless explicitly asked — hand over the exact commands instead ([17-git-and-collaboration.md](17-git-and-collaboration.md)).
