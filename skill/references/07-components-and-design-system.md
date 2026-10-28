---
title: "Components and the design-system vocabulary"
chapter: 07
tags: [components, design-system, typography, icons, dialogs, sheets, lists, accessibility, jsx]
applies_to: ["src/components/**", "src/shared/ui/**", "src/features/**/components/**", "src/features/**/screens/**", "src/app/**"]
related: [04-naming-and-files.md, 05-file-layout.md, 08-styling-and-theme.md, 09-navigation-expo-router.md, 12-i18n.md]
last_updated: 2026-10-28
---

# Components and the design-system vocabulary

Every app hand-rolls a **small set of primitives from its tokens**. No UI kit (Paper, NativeBase, Tamagui). `@expo/ui` is used only for presentation shells a hand-rolled version cannot match (native bottom sheet, native menu, date/time pickers), and its children are still ordinary views built from the app's tokens.

The **names and props below are canonical across all apps**; the look (values, colors, shapes) is per app. Primitives live in `components/<name>/` (layered) or `shared/ui/<name>/` (feature-based) and are exported from the UI public barrel.

## Canonical vocabulary

| Primitive | Purpose | Key props |
| --- | --- | --- |
| `Typography` | **All** user-facing text. The only component that sets `fontFamily`. | `variant` (typography scale key), `color` (text role), `numberOfLines`, Text props |
| `Icon` | Every glyph, named in the app's vocabulary through a `GLYPHS` map | `name` (app vocabulary, e.g. `"reminder"`), `size: "sm" \| "md" \| "lg"`, `color` |
| `IconButton` | A touchable icon on its own: round, ≥ `MIN_TOUCH_TARGET` | `icon`, `label` (**required**, a11y), `onPress`, `locked?` |
| `Touchable` | Base pressable with the app's press feedback | Pressable props |
| `Button` | Actions | `label`, `variant: "primary" \| "outline" \| "link" \| "danger" \| "dangerSubtle"`, `loading`, `disabled`, `leading` |
| `Screen` | Container every route renders into: safe area, gutter, keyboard, scroll | `scroll: boolean \| "child"`, `padded`, `centered`, `background`, `contentStyle` (gap only), `footer`; headerless apps add `title`, `back`, `actions` |
| `ScreenState` | Whole-screen loading / error / empty / offline | discriminated `kind` (see chapter 06); `SectionState` is the compact inline variant |
| `Field` | Shared frame of every input (label, required/optional mark, helper + error line, box). **Never used by screens.** | internal |
| `TextField`, `DateField`, `TimeField` | Inputs built on `Field` | `label`, `optional`, `error`, value/onChange; dates carry `YYYY-MM-DD`, times `HH:MM` |
| `Select` | Single choice | `layout: "chips" \| "segmented" \| "menu"`, `options`, `value`, `onChange`, `optional` |
| `Toggle` / `SwitchField` | Bare switch / switch inside a `Field` box | `value`, `onValueChange`, `label` |
| `Section` | A titled group of controls with an optional footer note | `title`, `note?` |
| `StatusBadge` | A status as **color + word** (and optional icon) | `tone`, `label`, `icon?` |
| `Dialog` + `DialogHost` | Confirmations and notices, driven by `useDialogStore` | `show({ title, message?, actions? })`, `dismiss()` |
| `ActionSheet` / `Menu` | Every "three dots" menu (`ActionSheet`) / a choice from a platform list (`Menu`, wraps `@expo/ui` `MenuView`) | grouped rows with icons; `locked` rows still run |
| `AppBottomSheet` | The one bottom-sheet wrapper (`@expo/ui`) | `snapPoints` from `SHEET_SNAP_POINTS`, `ref.present()`/`dismiss()` |
| `toastUtils` | One-off feedback | `showSuccess(message)`, `showError(message)` — title only, from the bottom |

Hosts (`DialogHost`, toaster, paywall host, sync hosts) are mounted once — `components/<name>-host/` (layered) or `shell/<name>/` (feature-based).

### Typography

- `variant` keys come from the typography scale (chapter 08): `display`, `title`, `heading`, `body`, `bodyStrong`, `bodySmall`, `caption`, `label`, `micro`.
- `color` is a text role, never a hex: `primary` (default), `secondary`, `muted`, `brand`, `onBrand`, `success`, `warning`, `danger`, `inverse`.
- A raw `<Text>` with inline font styles is a defect. A `TextInput` takes every type token **except `lineHeight`** (iOS lays the value out against it and pushes text above center).

### Icons

- Every glyph goes through `Icon`. The icon family is an app decision — Ionicons via `@expo/vector-icons` by default — and only `Icon` imports it. A call site asks for `"reminder"`, never `"notifications-outline"`, so what a mark means is decided once. Adding an icon is one entry in `GLYPHS`; changing the icon family is one file. A raw `<Ionicons>` at a call site is a defect.
- `size` is a key of `iconSize`, never a number.
- A symbol the icon font lacks is an SVG asset in `assets/icons/`, drawn on a 24-unit grid at the font's stroke weight, stroke only, registered in the same map. Never hand-draw paths inline.
- Exception: native tab bars draw their own system symbols (SF Symbols / Material).

### Press feedback

Every tappable surface is a `Touchable` (or a primitive built on it): it takes the press down ~2% and to ~90% opacity over ~120 ms, so a tap never reads as dead while the next screen loads. Under reduced motion (`useReducedMotion`) the movement is dropped entirely.

### Dialogs, sheets, menus, toasts

- **Never `Alert.alert`.** The platform alert ignores the theme. Confirmations and notices go through `useDialogStore().show(...)`, rendered by the single `DialogHost`. Code outside React (a mutation runner) uses `useDialogStore.getState().show(...)`.
- A `Dialog` is for confirming an action (above all a destructive one) or an error the user must read — **never a menu of choices**. Buttons are stacked full width: the action first (`danger` when it destroys), the back-away action below. Every action dismisses the dialog before it runs; an action with no `onPress` only dismisses. Keep what the message names in state until the dialog has faded out.
- A "three dots" in a row or header opens an **`ActionSheet`**: grouped rows with icons, the destructive action last in a "Manage" group. A list and its detail screen open the same sheet, built once in a `actionSheetUtils` module. A pressed row runs **after** the sheet closes, so a dialog, another sheet or a navigation never stacks on it.
- A one-off result is a **toast** (`toastUtils`), not a dialog.
- Bottom sheets go through `AppBottomSheet`; heights come from `SHEET_SNAP_POINTS` (`compact` 50/70%, `list` 70/90%, `full` 85%), chosen by what the sheet holds. A bespoke literal needs a comment saying why. Open with `ref.present()`; never mount a sheet conditionally.

## Component rules

### Responsibility

A component is **presentational** (props in, render out — no data fetching, no navigation decisions) or a **container** (a screen: calls hooks, resolves data and callbacks, renders presentational children). Never both.

### Props

- `<Component>Props` type; defaults at destructuring (`{ variant = "primary" }`).
- Primitives that wrap an RN primitive extend its props and spread the rest onto the root, so `disabled`, `onPress` and a11y props pass through.
- Booleans name a state (`isOverdue`); mutually exclusive states are one discriminated prop.
- Do not accept a `style` prop on a component that owns its layout — it makes every caller a source of layout drift. The exception is vendor branding (Google/Apple sign-in buttons) through `style`/`labelStyle` on `Button`.
- Compound components (`Button.Title`) only when the sub-part is meaningless outside its parent.

### Conditional JSX

Prefer `{condition && <Node />}` over `condition ? <Node /> : null`. Keep a ternary only when there are two real branches. **Guard non-booleans explicitly**: `{count > 0 && …}`, `{average !== null && …}` — `{count && …}` renders `0`, and a bare number outside `<Text>` crashes on native. Use a fragment only for several siblings.

### Text and copy

Every visible string, including `accessibilityLabel`, comes from i18n (chapter 12). Never translate user or API data (names the user typed, catalog names).

### Accessibility

- Every interactive element: `accessibilityRole` + translated `accessibilityLabel`. A pressable with an icon and no label is invisible to a screen reader. Use `role="link"` only for navigation; a text-styled action is still a `button`.
- Touch targets ≥ `MIN_TOUCH_TARGET` (44 pt; apps may set 48 dp).
- **Status is never conveyed by color alone** — pair it with a word or icon (`StatusBadge`). Green/red is exactly the pair red–green color vision deficiency collapses.
- Respect `useReducedMotion` in every animation.

### Three states on every data surface

Every surface backed by data handles **loading, error and empty** explicitly, and an offline state where the data source can tell. "Empty" is an invitation ("add your first task"), never an error. A **section** inside a screen has its own states (`SectionState`): a section that renders `null` on failure reads as "nothing due", which is reassurance the app has not earned.

### Lists

- Long or growing lists use **`@shopify/flash-list` v2** — not `FlatList`, never `.map()` over a growing collection.
- FlashList v2: no `estimatedItemSize` / `estimatedListSize` / `estimatedFirstItemOffset` (removed). No `key` on children inside `renderItem`. It ignores `gap` in `contentContainerStyle`: space rows with `ItemSeparatorComponent`.
- Rows are `React.memo` components with stable props (no inline objects/arrays as props).
- Always `keyExtractor` with a stable id. Hide scroll indicators. Pay the bottom tab inset on the list content (chapter 08).
- A paged/animated view that a recycling list cannot draw (e.g. a page-flip binder) is a documented exception: mount only the visible page and its neighbours.
- Inside a bottom sheet, use the sheet library's own list (`BottomSheetFlatList` / `BottomSheetScrollView`) so scrolling and the sheet's drag gesture cooperate.

### Images

`expo-image` only. Pass `recyclingKey` (stable id) in list cells and keep a neutral placeholder so a recycled cell never flashes the previous image. When a stored image is replaced under the same key, stamp the URL (`?v=<timestamp>`) — neither the CDN nor `expo-image` notices on their own. Build remote URLs in one utils module; never hotlink third-party CDNs from UI.

### Motion

Three kinds, and no fourth: **press feedback** everywhere; at most **one orchestrated entrance** on one screen; **disclosure** (`Collapse`, animating height ~220 ms ease-out) where something folds. Nothing springs or overshoots unless the app's design ADR says so.

## Common names to migrate

When adopting the playbook in an existing app, these are the usual equivalents:

| Typical existing name | Canonical |
| --- | --- |
| `ScreenScaffold`, `Header` + `GradientScreen` / `ScreenError` wrappers | `Screen` (+ the app's background) + `ScreenState` |
| `ConfirmDialog` + `useConfirmDialog` + an alert store and host | `Dialog`, `useDialogStore`, `DialogHost` |
| `GlassIconButton`, `RoundButton`, `CircleButton` | `IconButton` (the look is the app's styling) |
| `Typography type=… themeColor=…` | `Typography variant=… color=…` |
| `StatusChip`, `Pill`, `Badge` used for statuses | `StatusBadge` |
| raw `<Text style={theme.type.x}>` | `Typography` |
| compound `Button.Title` / `Button.Icon`, styled-components | `Button` with `label` / `leading`, `StyleSheet` |
| app-specific primitives (`Card`, `Avatar`, charts) | keep — they extend the app's vocabulary |
