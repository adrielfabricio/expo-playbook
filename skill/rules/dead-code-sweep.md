> **Always applies.** After finishing an implementation, sweep and remove the dead code it introduced or revealed.

# Dead-code sweep after implementation

Whenever you finish a feature, fix, refactor or a `/speckit-implement` run (code landed, checks green), run this sweep **before declaring done**. Do not skip it because the change "looked local".

## Scope

1. **Change-local (required):** symbols, files, barrel exports, i18n keys, routes, query keys and store fields touched or replaced by the change.
2. **Repo-wide (required):** `npm run check:unused` (or `npx knip` — not a devDependency, downloaded on demand; offline, fall back to targeted `rg`/`grep`). Validate every hit with a search before deleting.

## What to check

| Area | Look for |
| --- | --- |
| Components | Folders/exports no caller uses but still listed in a UI barrel or a feature `index.ts` |
| Barrels | A feature `index.ts` or module entry point exporting symbols nobody imports |
| **Utils namespaces** | Members of a `default { … }` utils object with no `xUtils.member` call site — **knip cannot see these**; grep each member you touched |
| Hooks / stores / repositories / data modules | Functions referenced only by deleted UI, or only by tests of a removed API |
| Queries | Query keys and fetchers no screen subscribes to any more |
| Types | Exported types with zero importers |
| Theme / constants / storage keys | Tokens and keys with zero references |
| i18n | Keys whose UI was removed — **in every locale file at once**, keeping them symmetric |
| Database schema | Columns/tables with no reader — **flag only**; dropping one is its own planned migration |
| Content | Catalog slugs or entries no longer reachable |

## Rules for removal

- Delete only after confirming zero production importers; tests that only cover the dead API go with it.
- Barrels hide usage from a naive path search — grep the **symbol name**.
- Do not delete intentional public/future APIs named in `AGENTS.md` or an ADR without a product decision.
- Do not treat Zod sub-schemas, types used only via `z.infer`, ambient `.d.ts` declarations or config entry points as dead without reading their call sites.
- Unexport module-private constants (`export const` → `const`) used only in their file.
- If docs list the removed symbol, update them in the same change.

## Done criteria

- [ ] Change-local references cleaned
- [ ] knip (or equivalent) reviewed; dead code removed or deferred with a reason
- [ ] Every locale file still holds the same key set
- [ ] `npm run check:types` and the relevant tests still pass
- [ ] Wrap-up says what was removed vs intentionally kept
