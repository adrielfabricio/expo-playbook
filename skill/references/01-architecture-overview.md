---
title: "Architecture overview and choosing a shape"
chapter: 01
tags: [architecture, layered, feature-based, decision-guide]
applies_to: ["src/**"]
related: [02-architecture-layered.md, 03-architecture-feature-based.md, 04-naming-and-files.md, 10-state-and-data.md]
last_updated: 2026-10-28
---

# Architecture overview

Two source layouts are canonical. Neither is "better"; each fits a different shape of product. A project picks one, records it in `AGENTS.md` § Architecture, and does not mix them.

| | Layered (by file kind) | Feature-based (by capability) |
| --- | --- | --- |
| Top level of `src/` | `app/ components/ hooks/ stores/ repositories/ services/ utils/ global/ core/` | `app/ shell/ features/ shared/ core/` (+ optional `domain/`, `db/`) |
| Chapter | [02-architecture-layered.md](02-architecture-layered.md) | [03-architecture-feature-based.md](03-architecture-feature-based.md) |
| Boundary enforcement | Review + import rules in `AGENTS.md` | `npm run check:arch` (eslint-plugin-boundaries), at error severity |

## Invariants shared by both

1. **`src/app/` holds routes and `_layout` files only.** Expo Router turns every file there into a route, so a component, hook, type or helper placed there becomes a navigable URL.
2. **Dependencies flow downward only.** Presentation → state/orchestration → data access → services/clients → foundation. Nothing imports upward, and nothing imports `app/`.
3. **Data access has exactly one home.** Repositories (layered) or `data/` modules (feature-based) are the only code that touches Firestore, Supabase, SQLite, AsyncStorage or HTTP. A lint rule (`no-restricted-imports`) names the permitted files for the SDK.
4. **Screens never call a backend directly.** They call hooks; hooks call the data layer.
5. **One alias: `@/` → `src/`** (plus `@/assets/*` → `assets/*`). No per-layer aliases (`@core/`, `@features/`…): two spellings for one module, and the boundary tooling matches resolved paths, not alias text.
6. **One theme, one i18n, one monitoring wrapper** in the foundation layer (`global/` + `core/` in layered, `core/` in feature-based).
7. **Platform-specific modules** use Metro platform extensions (`index.ios.tsx`, `index.web.tsx`) when an entire module differs, rather than scattered `Platform.OS` branches.

## Choosing a shape (new project)

Prefer **feature-based** when any of these hold:

- the product has several capabilities with clear seams (tasks / projects / reminders / search);
- it belongs to a product family with sibling repositories (an admin panel, a backend) and features map to cross-repo specs;
- you want boundaries enforced by a machine rather than by review;
- the domain has pure rules worth isolating and testing without React (add `domain/`).

Prefer **layered** when:

- the app is one tightly connected domain where most screens read the same few collections (projects, tasks, comments), so "features" would import each other constantly;
- shared realtime subscriptions (Firestore listeners held in stores and mounted by hosts) are central to the data flow;
- the team is one person who benefits from a flat, predictable map of "where is every hook".

When unsure, start feature-based: moving from features to layers is a merge, while splitting layers into features later means re-deciding every file's owner.

## Changing shape

Switching an existing app between the two is an architectural decision: write an ADR first, migrate in steps behind `check:arch` (or a temporary allowlist), and update `AGENTS.md` and the project's docs in the same change set. Never half-migrate silently.
