---
title: "Tooling and configuration"
chapter: 15
tags: [tooling, npm-scripts, prettier, eslint, tsconfig, knip, expo-install, dependencies]
applies_to: ["package.json", "tsconfig.json", "eslint.config.js", "eslint.arch.config.js", ".prettierrc", ".editorconfig", ".nvmrc", "app.config.ts"]
related: [03-architecture-feature-based.md, 06-typescript.md, 14-testing.md, 16-environments-builds-releases.md, 21-new-project.md]
last_updated: 2026-10-28
---

# Tooling and configuration

## npm scripts

Every script is **`domain:action`** or **`domain:action:variant`**, never a single token. Flags after `--` are not name segments. `npm run` with no argument lists them.

| Script | Command |
| --- | --- |
| `expo:start` | `expo start` |
| `expo:ios` / `expo:android` | `expo run:ios` / `expo run:android` (dev builds; an Expo Go-only app may use `expo start --ios`) |
| `expo:web` | `expo start --web` (local runs only, unless the app publishes web) |
| `check:lint` | `expo lint` |
| `check:types` | `tsc --noEmit` (plus `-p` for any separate test project) |
| `check:arch` | `eslint --config eslint.arch.config.js --max-warnings=0 src` (feature-based) |
| `check:unused` | `npx knip` (knip is not a devDependency) |
| `format:write` / `format:check` | `prettier --write .` / `prettier --check .` |
| `test:unit` / `test:watch` / `test:coverage` | `jest` / `jest --watch` / `jest --coverage` |
| `build:local:ios` / `build:local:android` / `build:local:apk` | `eas build --local` with the production profiles (chapter 16) |
| `upload:ios` / `upload:android` | `eas submit --path build/artifacts/…` |
| `db:generate` | `drizzle-kit generate` (apps with a local DB) |
| `legal:build` / `legal:deploy` | render and publish legal pages (apps that host them) |

**The `lint` exception is not fixable.** `expo lint` re-adds `"lint": "expo lint"` to `package.json` on every run and reindents the file with spaces against Prettier's tabs. Leave the `lint` entry, use `check:lint`, and **run `npm run format:write` after `check:lint`**. While iterating, `npx eslint .` avoids the rewrite.

Template: [`templates/package.scripts.json`](../templates/package.scripts.json).

## Formatting

Prettier is the only formatter; ESLint does not format. `format:check` runs in CI, so formatting is never a review topic. Markdown is excluded (`.prettierignore`: `*.md`, lockfiles, `ios/`, `android/`, `build/`, `coverage/`, `.expo/`, `expo-env.d.ts`, migrations).

```json
{
	"useTabs": true,
	"tabWidth": 2,
	"semi": true,
	"singleQuote": false,
	"trailingComma": "all",
	"printWidth": 100,
	"bracketSpacing": true,
	"arrowParens": "always",
	"endOfLine": "lf"
}
```

`.editorconfig` mirrors it (tabs, size 2, LF, final newline, trim trailing whitespace except `*.md`). Templates: [`templates/.prettierrc`](../templates/.prettierrc), [`templates/.editorconfig`](../templates/.editorconfig).

## TypeScript config

`expo/tsconfig.base` + strict (+ the four extras on new projects, chapter 06). Paths: `"@/*": ["./src/*"]`, `"@/assets/*": ["./assets/*"]`. Aliases are declared **only** in `tsconfig.json` (Expo's `tsconfigPaths` is on by default): no `babel-plugin-module-resolver`, no `baseUrl`. Template: [`templates/tsconfig.json`](../templates/tsconfig.json).

## ESLint

Flat config (`eslint.config.js`) on `eslint-config-expo/flat` — never `.eslintrc.js`. The canonical config adds:

| Rule | Purpose |
| --- | --- |
| `no-restricted-syntax` on `TSEnumDeclaration` | unions over enums |
| `no-restricted-syntax` on hex literals and raw numeric style values in app sources | tokens only (chapter 08) |
| `no-restricted-syntax` on `toISOString().slice(0, 10)` outside the dates module | calendar dates read in UTC are a day off west of UTC |
| `no-restricted-imports` of the backend SDK outside the client and data modules | one door to data (chapter 10) |
| `import/order` (builtin → external → `@/**` → relative, blank lines between) | the import slot of chapter 05 |
| `import/no-named-as-default(-member)` off | false positives with i18next and similar |

Feature-based apps add `eslint.arch.config.js` (boundaries + `import/no-cycle` + `no-unknown-files`), run by `check:arch`. Templates: [`templates/eslint.config.js`](../templates/eslint.config.js), [`templates/eslint.arch.config.js`](../templates/eslint.arch.config.js).

Exceptions live in the config file, scoped by `files`, never in inline `eslint-disable` comments.

## app.json / app.config.ts experiments

```ts
experiments: { typedRoutes: true, reactCompiler: true }
```

With the React Compiler on, manual `useMemo`/`useCallback` is optional; Reanimated shared values use `.get()` / `.set()` (the compiler's `react-hooks/immutability` flags `sv.value = …`).

## Runtime versions

- Node pinned in `.nvmrc` (24.x), npm 10+/11.
- Read the **versioned** Expo docs for the SDK in use (`docs.expo.dev/versions/vNN.0.0/`) — generic answers are often a major version stale.

## Dependencies

- Expo-ecosystem packages: **`npx expo install`**, never plain `npm install` (it resolves the version matching the SDK).
- **`npx expo-doctor` must be clean before a native build.** `expo install` resolves against the latest version map; a project behind it gets packages built for a newer `expo-modules-core`, which type-checks fine and fails only as a native compile error in the build. Fix with `npx expo install --fix`, not by pinning down the new package.
- A package intentionally ahead of the SDK pin (Sentry v8) goes in `expo.install.exclude`.
- **Never bump a dependency as a side effect** of unrelated work — record it in the tech-debt register and bump it on purpose, in its own change.
- Pins forced by the toolchain (ESLint 9 for `eslint-config-expo`, a Zod major deduped with Expo CLI) are recorded with their exit condition in the tech-debt register.

## Unused code

`npm run check:unused` (knip) after every implementation, then validate each hit with a search before deleting. Knip does not see unused members of namespace objects; check those by hand ([`rules/dead-code-sweep.md`](../rules/dead-code-sweep.md)).
