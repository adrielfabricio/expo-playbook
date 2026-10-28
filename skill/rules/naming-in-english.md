> **Always applies.** Everything in the repository is English; the app's own locales live only in what the product says to its users.

# Naming: English everywhere, docs included

No mixing, at any level, from the first commit — renaming a column after data exists is a migration, and rewriting a published document is no cheaper.

## English

| Layer | Example |
| --- | --- |
| Tables, columns, enum values | `orders.total_cents`, `'due_soon'` |
| Slugs and i18n **keys** | `engine-oil`, `settings.notifications.title` |
| Files, components, functions, variables | `use-task-detail.ts`, `StatusBadge` |
| Branches, commits, PRs | `feat(tasks): add due date picker` |
| `AGENTS.md`, `CLAUDE.md`, `README.md`, `docs/`, ADRs, comments | — |

## The app's own voice (the locales declared in `AGENTS.md`)

| Layer | Example |
| --- | --- |
| i18n **values** | `"settings.notifications.title": "Notificações"` |
| Published legal pages | privacy policy, terms, support |
| Store release notes | the "What's new" text in `docs/release-notes.md` |

Their file names, and the English text around them, stay English.

## The one exception

Acronyms of national registries and official documents keep their own form — e.g. Brazil's `cnh` or `renavam` — because they name a specific registry, like `vin` or `iban`. Where an exact international term exists, use it (`vin`, `plate`).

## Enforcement

- No user-facing string literal in a component: every visible string comes from i18n.
- A non-English identifier in a diff, or a non-English sentence in a doc, comment or commit message, is a review blocker.
- The conversation with the human follows `AGENTS.md` § Conversation language; it never leaks into the repository.
