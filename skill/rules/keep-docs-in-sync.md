> **Always applies.** Documentation updates are part of the same change whenever the change affects how a human or an agent works on the project.

# Keep docs in sync with code

## Do update when you change

| Change | Update |
| --- | --- |
| A layer, folder, path alias, npm script, or a dependency used as platform | `README.md`, `AGENTS.md` (§ Architecture / § Commands) |
| A domain rule, invariant, schema, table, column or enum value | `AGENTS.md` (the rule) and the project doc that explains it (the reason) |
| A module's ownership or a boundary between features | `AGENTS.md` § Architecture; `eslint.arch.config.js` when the boundary is enforced |
| An architectural decision, or a contradiction with an existing ADR | A new ADR (or a dated implementation note); the ADR index |
| Env vars, build or release setup | `.env.example`, `README.md`, `AGENTS.md` § Commands |
| The app's `version` | `CHANGELOG.md` and `docs/release-notes.md` in the same change |
| A deliberate difference from the expo-playbook | `AGENTS.md` § Deviations (what, why, ADR if any) |
| A generic convention that should hold for every app | The **expo-playbook** itself — not a project copy |
| Anything listed in the project's own **doc map** (`AGENTS.md`) | The document that map names |

Source-of-truth order: cross-project ADRs → project ADRs → expo-playbook → `AGENTS.md` → `docs/` → code. Nothing under `tmp/`, `specs/` or `.specify/` is a source of truth.

**A rule goes in `AGENTS.md`; the reasoning goes in `docs/`.** `AGENTS.md` loads every session; a rule moved into `docs/` is one an agent can miss. When an `AGENTS.md` section grows an explanation, move the explanation and leave the rule plus a pointer.

## Do not update

- Pure UI polish, copy, or a bug fix with no change to contracts, layout, scripts, env or architecture.
- Refactors that preserve public behavior and documented structure.
- Speckit bookkeeping: never put feature IDs (`NNN-slug`), paths under `specs/` / `.specify/`, or "migrated in feature …" into committed docs.

## How to apply

1. Before finishing, ask: "Would `AGENTS.md`, the project docs or the playbook mislead the next agent?"
2. If yes, edit the **canonical** document in the same change set as the code.
3. Prefer a short accurate correction over a rewrite. Never rewrite ADR history.
4. List the documents touched in the wrap-up.
