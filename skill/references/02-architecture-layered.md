---
title: "Layered architecture (by file kind)"
chapter: 02
tags: [architecture, layered, hooks, orchestration, repositories, hosts]
applies_to: ["src/**"]
related: [01-architecture-overview.md, 04-naming-and-files.md, 07-components-and-design-system.md, 09-navigation-expo-router.md, 10-state-and-data.md]
last_updated: 2026-10-28
---

# Layered architecture

Folders are grouped by what kind of file they hold, and layers depend downward only.

## Layout

```plaintext
src/
├── app/                 Routes and _layout files only (Expo Router)
├── components/          UI components, one kebab-case folder each; public barrel index.ts
│   └── <name>-host/     Mount-once composition (AuthGuard, DialogHost, data sync hosts)
├── hooks/               Domain hooks (live data) + orchestration hooks (screens, sheets) + UI helpers
├── stores/              Zustand stores (session, UI state, shared realtime subscriptions)
├── repositories/        The ONLY data access (Firestore / SQLite / AsyncStorage / HTTP)
├── services/            SDK clients and external APIs: firebase/, purchases/, haptics/, <api>/
├── utils/               Pure helpers, default-namespace modules + barrel exporting `*Utils`
├── global/
│   ├── theme/           Design tokens (theme.ts) — see chapter 08
│   ├── types/           Domain types (project.ts, premium.ts…)
│   └── constants/       Constants and storage keys
├── core/i18n/           i18next init + locales
└── types/               Ambient .d.ts only (assets, i18n typing)
```

## Layers and the import rule

| Layer | Folder | May import |
| --- | --- | --- |
| Presentation | `app/`, `components/` | hooks, stores (selectors only), utils, global, core |
| State | `hooks/`, `stores/` | repositories, services, utils, global, core |
| Data access | `repositories/` | services (clients, paths), utils, global |
| Services | `services/` | utils, global |
| Foundation | `utils/`, `global/`, `core/` | each other, never upward |

- **Screens and components never import a repository, an SDK or a service.** They go through a hook. A route that imports `@/repositories/*`, `@/services/*` or a mutation runner is a defect.
- **Inside `components/`, import siblings by direct path** (`@/components/typography`), never through `@/components` — re-entering the barrel creates Metro require cycles. Screens and hooks import the public API from `@/components`.
- **Inside `utils/`, import siblings by direct path** for the same reason; everyone else imports `{ fooUtils } from "@/utils"`.
- Shared types consumed by utils, hooks and stores live in `global/types/{domain}.ts`, never exported from a `*.utils.ts`.

## Two levels of hooks — do not merge them

| Level | Role | Examples |
| --- | --- | --- |
| **Domain hooks** | Live data: open a listener / query through a repository, or read a shared store | `useProjects`, `useProjectTasks`, `useTags`, `useFavorites` |
| **Orchestration hooks** | Everything a screen or a write-capable sheet does: UI state, filters, dialogs, exports, navigation on action, mutations, auth and preference side effects | `useProjectDetail`, `useProjectsTab`, `useNewProject`, `useSettings`, `useSearchBottomSheet` |

Rules:

1. Orchestration hooks return **typed data + handlers, never JSX**. The route/sheet stays visual composition (refs, `present`/`dismiss`, JSX).
2. **One orchestration hook per material route or write-capable sheet.** Share pure logic through `utils/` or domain hooks, never through a generic multi-screen hook.
3. A write-capable sheet calls **its own** hook; the parent does not inject mutation handlers.
4. Do not invent an orchestration hook for an already thin route (symmetry is not a reason).
5. Naming: tab screens `use<Name>Tab`, detail screens `use<Name>Detail`, flows by verb (`useNewProject`, `useEditProject`), sheets by the sheet (`useMoveTask`).

## Routes in this architecture

A route file **is** the screen composition: it calls one orchestration hook, renders components from `@/components`, and keeps at most a tiny local `StyleSheet` for layout glue. No business logic, no data access, no co-located components. Details in [09-navigation-expo-router.md](09-navigation-expo-router.md).

```tsx
export default function ProjectsScreen() {
	const { t } = useTranslation();
	const { projects, isLoading, error, handleAddPress, handleProjectPress } = useProjectsTab();

	return (
		<Screen
			title={t("projects.title")}
			actions={[{ icon: "add", label: t("common.addProject"), onPress: handleAddPress }]}
		>
			{isLoading || error ? (
				<ScreenState kind={error ? "error" : "loading"} />
			) : (
				<ProjectList projects={projects} onProjectPress={handleProjectPress} />
			)}
		</Screen>
	);
}
```

## Hosts: mount-once composition

Anything that must exist exactly once while the app runs (auth gate, dialog host, toaster, paywall host, realtime sync hooks) is a component under `components/<name>-host/` (or `auth-guard/`) mounted by the root layout or by `AuthGuard` when signed in. A host usually renders `null` or a single overlay. Never mount a second copy per screen. The shared-subscription pattern that relies on hosts is in [10-state-and-data.md](10-state-and-data.md#firestore-realtime-shared-subscriptions).

## Mutation context guards

When the **same multi-value guard** (`if (!uid || !card || !id) return`) repeats across three or more handlers of one hook, extract a **module-level** `function require<Thing>Context(uid, card, id)` that returns the narrowed values or `null`. Never wrap a single value (`requireUid`), never nest the helper inside the hook, never create a global `assert*` util — contexts differ per surface.

## Checklist for a new screen

- [ ] Route in `app/`, composing components and one orchestration hook
- [ ] Orchestration hook in `hooks/use-<screen>.ts`, returning data + handlers
- [ ] Data reads through a domain hook; writes through a repository function called from the hook
- [ ] New UI pieces in `components/<name>/`, exported from `components/index.ts` only if a screen or hook consumes them
- [ ] Strings in both locale files; loading / error / empty states handled
