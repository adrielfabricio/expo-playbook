> **Always applies where Speckit is used** (`.specify/` exists in this repository or the workspace above it).

# Speckit policy

## Location

- **Multi-repo workspace** (a folder holding several repositories of one product): `.specify/` and `specs/` live at the workspace root, outside every repository. Run `/speckit-*` with the workspace root as working directory, and write every path in a spec, plan or task list **with its repository prefix** (`apps/mobile/src/…`, `site/src/…`).
- **Single repository:** `.specify/` and `specs/` live in the repository and are **gitignored**.

## Git

- Never create or switch branches for Speckit (`/speckit-specify`, `/speckit-plan`, `/speckit-tasks`, `/speckit-implement`, `speckit.git.feature`). Stay on the current branch.
- Feature identity is `.specify/feature.json` (`feature_directory`) and `specs/NNN-slug/`, not a branch name. Numbering is sequential over `specs/`.
- Never run `git checkout -b`, `create-new-feature.sh` or similar to "fix" a prerequisite.
- Git hooks/extensions in `.specify/extensions.yml` stay `enabled: false` (or removed).
- Nothing is committed unless the human explicitly asks.

## Order

`speckit-constitution` → `speckit-specify` → `speckit-clarify` → `speckit-plan` → `speckit-tasks` → `speckit-implement`, with `speckit-analyze` / `speckit-checklist` / `speckit-converge` as checks.

- **Constitution:** the expo-playbook plus the affected repository's `AGENTS.md` and ADRs. Read them before `/speckit-specify` and `/speckit-plan`; the plan's Constitution Check checks against them.
- **Sizing:** one spec per backlog / build-order item. A spec that sprouts sub-features is split.
- **Implementation** runs each repository's Definition of Done and always-on rules.

## Nothing from Speckit leaks out

Code, comments, string literals, identifiers, config files and committed docs never cite Speckit artifacts: no "User Story N", `FR-###`, `SC-###`, task IDs, `spec.md`/`plan.md`/`tasks.md`, `specs/…` paths or spec numbers. Write every comment and doc as if `specs/` did not exist — state the actual constraint or reason. A rule that needs a durable home goes in `AGENTS.md` or an ADR.
