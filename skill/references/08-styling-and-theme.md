---
title: "Styling, tokens and theme"
chapter: 08
tags: [styling, theme, tokens, spacing, colors, typography, safe-area, dark-mode, shadows]
applies_to: ["src/core/theme/**", "src/global/theme/**", "src/**/styles.ts", "src/**/*.tsx"]
related: [07-components-and-design-system.md, 09-navigation-expo-router.md, 15-tooling-and-config.md]
last_updated: 2026-10-28
---

# Styling, tokens and theme

## One place for every value

All design values live in the theme folder — `src/core/theme/` (feature-based) or `src/global/theme/` (layered). **A hex color, font size, radius or spacing literal anywhere else is a defect**, enforced by lint where the app has the rule (template in chapter 15) and by review otherwise. This is what makes a rebrand or dark mode a one-folder change.

```plaintext
core/theme/
  colors.ts          palette (private raw values) + semantic roles
  spacing.ts         spacing, radius, iconSize, layout constants
  typography.ts      fontFamily + typography scale
  navigation-theme.ts React Navigation theme override
  theme-provider.tsx only when the theme is dynamic (dark mode)
  index.ts           module entry point
```

`app.config.ts` cannot import from `src/` (it runs in the Expo CLI), so the splash/background colors repeated there carry a comment naming the token they mirror.

## Canonical token names

Names are shared by every app; **values are per app**.

```ts
// colors.ts — semantic roles. Components read roles, never the raw palette.
export const colors = {
	background, surface, surfaceAlt,       // canvas, cards, alternate surface
	border, borderStrong,
	textPrimary, textSecondary, textMuted,
	brand, brandPressed, brandSubtle, onBrand,
	success, successSubtle,
	warning, warningSubtle,
	danger, dangerSubtle,
	scrim,
};

// spacing.ts — 4-point scale; the key is the multiple of 4.
export const spacing = { half: 2, 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48, 16: 64 } as const;
export const radius = { sm, md, lg, xl, full: 999 } as const;
export const iconSize = { sm, md, lg } as const;          // exactly three; <Icon size="md">

export const CONTROL_HEIGHT;            // every Button and every field box
export const MIN_TOUCH_TARGET;          // 44 (or 48 on Android-first apps)
export const SCREEN_PADDING_HORIZONTAL; // applied once, by <Screen>
export const BOTTOM_TAB_INSET;          // tab bar clearance per platform (Platform.select)
export const SHEET_SNAP_POINTS = { compact: ["50%", "70%"], list: ["70%", "90%"], full: ["85%"] };

// typography.ts
export const fontFamily = { regular, bold, display };
export const typography = { display, title, heading, body, bodyStrong, bodySmall, caption, label, micro }; // TextStyle each
```

- An app with a brand accent beyond `brand` adds `accent` / `accentSubtle`. Domain status colors (e.g. health states) are a mapping onto `success/warning/danger` in the app's theme, not new hexes.
- Decorative use of `brand` must not be confused with a state: `success` asserts a status.
- Rules that need no token stay out of the theme (a one-off `flex: 1` is fine).

## styles.ts

**Static theme** (one palette): a plain default-exported stylesheet.

```ts
// styles.ts
import { StyleSheet } from "react-native";

import { colors, radius, spacing } from "@/core/theme";

export default StyleSheet.create({
	container: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing[3], gap: spacing[2] },
});

// index.tsx
import styles from "./styles";
```

**Dynamic theme** (light + dark): the default export is a factory, memoised in slot 2 of the component ([05](05-file-layout.md)).

```ts
// styles.ts
import { StyleSheet } from "react-native";

import type { Theme } from "@/core/theme";

export default function createStyles(theme: Theme) {
	return StyleSheet.create({
		container: { backgroundColor: theme.colors.surface, padding: theme.spacing[3] },
	});
}

// index.tsx
import createStyles from "./styles";
// …
const { theme } = useTheme();
const styles = useMemo(() => createStyles(theme), [theme]);
```

Rules:

- **No style objects created during render** (`style={{ margin: 8 }}`): a new object every render breaks `React.memo` below it, which costs frames in list rows. Compose arrays for conditional styles: `style={[styles.base, isActive && styles.active]}`.
- A value that is continuous or animated (a percentage width, a measured height, an animated style) is the only thing passed inline.
- Prefer flex `gap` over margin chains. `borderCurve: "continuous"` on rounded corners.
- A screen's `contentStyle` sets `gap` only — `Screen` owns padding and vertical rhythm.
- A route may keep a tiny local `StyleSheet` for layout glue (layered); a feature screen uses its own `styles.ts`.

## Theme modes

- `userInterfaceStyle` in `app.config.ts` matches what the palette ships: `"light"` or `"dark"` for a single palette, `"automatic"` only when the app ships both and uses the dynamic theme.
- Do not scatter conditional color logic in anticipation of dark mode: components reading roles is exactly what makes adding it a theme-folder change.
- React Navigation paints behind every screen with its own theme: override it (`navigation-theme.ts`, mounted with `ThemeProvider` in the root layout) so the background equals the canvas, and give a route whose screen is not the canvas its own `contentStyle`.
- Fonts load in the root layout via `@expo-google-fonts/*`, with the splash screen held until they resolve — text never renders in a fallback face and reflows.

## Safe area and insets

- **`Screen` owns the safe area, the horizontal gutter and the keyboard.** No screen sets its own `paddingHorizontal` or reads `useSafeAreaInsets` for layout.
- Never `SafeAreaView` from `react-native` (deprecated, no-op on Android); use the one from `react-native-safe-area-context` or `react-native-screens`, inside `Screen` only.
- **One inset owner per edge.** On a scrolling screen, the scroll **content** pays the tab-bar clearance (`insets.bottom + BOTTOM_TAB_INSET`), not the container; a screen whose child scrolls says so (`scroll="child"`) and the list pays it in `contentContainerStyle`. Two owners produce a double inset or a dead band.
- With a tab bar overlay (iOS 26 glass pill, Android floating pill), use `contentInsetAdjustmentBehavior="never"` on lists and pay the inset yourself; `contentInset.bottom` is ignored on Android.
- Hide scroll indicators on every scrolling view.

## Per-app design decisions (record them in an ADR or the app's styling doc)

- **Shadows:** either none (surfaces separated by color) or a documented elevation token. When used, split by platform: `boxShadow` on web, `shadow*` + `elevation` on native — never legacy `shadow*` in styles that run on web.
- **Gradient backgrounds**, glass effects, display typefaces, motion personality.
- **Icon sizes and control height values.**
