---
title: "Testing"
chapter: 14
tags: [testing, jest, jest-expo, vitest, testing-library, coverage, tanstack-query, firestore-rules]
applies_to: ["src/**/__tests__/**", "tests/**", "jest.config.js", "jest.setup.js", "vitest.config.ts"]
related: [10-state-and-data.md, 15-tooling-and-config.md, 19-agent-workflow.md]
last_updated: 2026-10-28
---

# Testing

## Runners

- **Default: Jest with the `jest-expo` preset** + `@testing-library/react-native`.
- **Vitest** is acceptable for a codebase whose tests are pure TypeScript (domain rules, schemas, migrations against `better-sqlite3`) when the RN harness does not run on its toolchain; record why in `vitest.config.ts`.
- A suite that needs a different environment (Firestore rules against the emulator) is a **separate project** with its own config, excluded from the root run (`testPathIgnorePatterns`), and typechecked by `check:types`. Never let it inherit the `jest-expo` preset.
- Shared setup in `jest.setup.js`: mock AsyncStorage, Sentry, toast libraries.
- `moduleNameMapper` maps `^@/(.*)$` (and `@/assets`) when the preset does not resolve tsconfig paths.
- Reanimated-dependent components need `resolver: "react-native-worklets/jest/resolver"`.

## Location and naming

`__tests__/<module>.test.ts(x)` next to the code. Unit tests never live in a top-level `tests/`.

## What to test (in priority order)

1. **Pure business logic and derived state** — status from dates, totals, limits, domain rules.
2. **Zod schemas** at boundaries, including invalid input.
3. **Data-module / repository contracts** with the backend mocked (mock the client module, e.g. `@/core/supabase`, so the production code path is what runs).
4. **Hooks** with real logic.
5. **A render smoke test per screen** (where the RN harness runs).

Do not test third-party SDK internals, store internals or snapshot whole screens. 100% coverage of a component that renders a label proves nothing.

## Coverage floors

| Area | Floor |
| --- | --- |
| Data access (`repositories/`, `data/`), external API clients | ≥ 80% |
| Domain / pure utils with business rules | ≥ 80% |
| Hooks, stores | ≥ 70% |
| Components | none (smoke + targeted tests) |

Enforce with `coverageThreshold` per folder where CI runs coverage.

## Traps that cost real time

- **`@testing-library/react-native` v14 is async.** `render`, `renderHook`, `fireEvent.press`, `rerender` and `unmount` return Promises; without `await`, `result` is undefined and assertions fail misleadingly.
- **TanStack Query keeps Jest alive.** The default `gcTime` (5 min) holds the event loop: a suite that passes in 2 s takes ~300 s to exit, and `--detectOpenHandles` reports nothing. Build clients with `createTestQueryClient()` (`gcTime: 0`, `retry: false`) from `shared/mocks`, and `clear()` + `unmount()` in `afterEach`. Never `new QueryClient()` in a test.
- **Date-dependent logic freezes time** (`jest.useFakeTimers().setSystemTime(...)`). A test that passes today and fails at a month boundary trains people to ignore red builds.
- **Security rules are tested in both directions**: denials prove they are tight, an owner happy path proves they are not too tight. Run rule suites with `maxWorkers: 1` (one emulator, cleared between tests). Derive paths from the app's `paths.*` helpers.
- **Characterization tests** document existing behavior, quirks included. Editing one to make it pass is a behavior change, not maintenance.
- **Watch wall-clock time**, not only green output. A slow suite stops being run.
