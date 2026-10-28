---
title: "Environments, builds and releases"
chapter: 16
tags: [eas, environments, app-config, env-vars, secrets, builds, versioning, changelog, release-notes, stores]
applies_to: ["app.config.ts", "eas.json", ".env.example", "CHANGELOG.md", "docs/release-notes.md", "package.json"]
related: [13-errors-and-observability.md, 15-tooling-and-config.md, 17-git-and-collaboration.md, 18-documentation-system.md]
last_updated: 2026-10-28
---

# Environments, builds and releases

## App config

- **`app.config.ts`** (TypeScript, dynamic) — an invalid key is a type error instead of a silently ignored line, and identity can branch on the environment. A static `app.json` is legacy.
- The environment comes from **`APP_ENV`** (set per EAS profile in `eas.json`, falling back to `EAS_BUILD_PROFILE`, then `development`). `app.config.ts`:
  - sets the identity per environment when internal builds must install beside the store app (`name`, `scheme`, `ios.bundleIdentifier`, `android.package` with a `.dev` suffix);
  - writes `extra.appEnv`;
  - **fails closed** for production when a required production value is missing or points at the dev backend (throw with a message naming the EAS environment to fill).
- The app reads the environment through **`expo-constants`** (`Constants.expoConfig?.extra?.appEnv`) in one helper (`getAppEnv()`), never `process.env.APP_ENV` — only `EXPO_PUBLIC_*` vars are inlined into the bundle.
- `owner` and `extra.eas.projectId` are written in the config, not read from env: EAS CLI does not read `.env`.
- `ios.config.usesNonExemptEncryption: false` (or `ITSAppUsesNonExemptEncryption`) when the app only uses HTTPS, so builds are not held at export compliance.
- Permissions: declare what is used; list in `android.blockedPermissions` what dependencies would merge in but the app must not request (check the generated manifest for `tools:node="remove"`).
- Values that cannot import tokens (splash/background colors) repeat the token with a comment.

Template: [`templates/app.config.ts`](../templates/app.config.ts).

## Env vars and secrets

- Client-exposed vars need the **`EXPO_PUBLIC_`** prefix. Anything without it is build-time only and must never reach the bundle.
- `.env` is gitignored; **`.env.example`** is the template listing every variable with a comment. An app with no secrets has no `.env` at all — do not introduce one without need.
- EAS Environment variables per profile (`development`, `preview`, `production`). Production secrets never go to non-production environments.
- Visibility: a value a **local** build needs (e.g. `SENTRY_AUTH_TOKEN` for source maps) is `sensitive`, not `secret` — `secret` never reaches `eas build --local`.
- Never commit signing material (keystores, `.p8`, Play service accounts, export options). Firebase config files (`google-services.json`, `GoogleService-Info.plist`) are **not** secrets and may be committed at the project root when native Firebase needs them at config evaluation; override their path per environment with a non-public env var.

## EAS profiles

```json
{
	"cli": { "version": ">= 21.0.0", "appVersionSource": "remote" },
	"build": {
		"development": { "distribution": "internal", "environment": "development", "android": { "buildType": "apk" }, "env": { "APP_ENV": "development", "SENTRY_ENVIRONMENT": "development" } },
		"production": { "autoIncrement": true, "environment": "production", "android": { "buildType": "app-bundle" }, "env": { "APP_ENV": "production", "SENTRY_ENVIRONMENT": "production" } },
		"production-apk": { "extends": "production", "android": { "buildType": "apk" } }
	},
	"submit": { "production": { "ios": { "ascAppId": "<id>" }, "android": { "track": "internal", "releaseStatus": "draft" } } }
}
```

- `development` is an internal **release** build installable from a link (add `developmentClient` only when you want a dev client). `production` is the store build; `production-apk` is for sideloading only — an APK is never a store artifact.
- Add `preview` only when there is a distinct QA backend.
- `appVersionSource: "remote"` + `autoIncrement`: **build numbers are EAS's**; never hand-edit them.
- In a development profile meant for devices, `SENTRY_DISABLE_AUTO_UPLOAD=true` so a rejected source-map upload never kills the build.

Template: [`templates/eas.json`](../templates/eas.json).

## Local builds (no build quota)

```bash
npm run build:local:ios       # IPA → build/artifacts/<app>-ios.ipa (macOS)
npm run build:local:android   # AAB → build/artifacts/<app>-android.aab
npm run build:local:apk       # APK → sideload only
npm run upload:ios            # eas submit --path … → App Store Connect / TestFlight
npm run upload:android        # eas submit --path … → Play internal track, draft
```

`build/` is gitignored and overwritten every run. Both paths need `eas login`. When the local `.env` points at dev, wrap production `eas` commands so the production EAS environment is authoritative (e.g. a `scripts/eas-prod.mjs` behind `npm run eas:prod -- <args>`). A native module change needs a new build, never an OTA update.

## Versioning and release

- `version` in `app.config.ts` follows **SemVer**: a fix bumps the patch, a new capability the minor. It is the version people see; one version may carry several builds.
- **`CHANGELOG.md`** follows [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/), in **English**, for developers: entries under `## [Unreleased]`, groups in the order `Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`, `Security`; each entry says in one or two sentences what changed and its effect. Maintenance with no effect on the app (dotfiles, formatting, dev-only deps) stays out. Until a version has reached a store, changes edit that version's `Added` entries.
- **`docs/release-notes.md`** holds the stores' "What's new" text: user-facing, in the app's locales (every locale the app ships), **≤ 500 characters per language** (Play Console's limit), counted with `wc -m`. Never write a note for a version already shipped and closed.
- **Cutting a version is one commit**, `chore(release): X.Y.Z`, that renames `[Unreleased]` to `[X.Y.Z] - YYYY-MM-DD`, opens a fresh `[Unreleased]`, updates compare links, bumps `version` (and any README badge), and adds the release notes. Build from that commit, tag it `vX.Y.Z`, push the tag. A tag is never moved; a rebuild that changes code is a new patch version.
- Store review prompts (`expo-store-review`) are asked only after a positive moment, through one service with explicit rules (minimum opens, days, spacing, yearly cap) — never on launch or from a screen directly.

## Legal pages

Privacy policy, terms and support are published outside the app (a site repository or Markdown rendered to Cloudflare Pages), linked from the app's profile/settings and sign-up screens and from the store listings. Their URLs are constants (or `EXPO_PUBLIC_*`) that must match the stores' listings. They describe exactly what the app does and what monitoring receives (chapter 13).
