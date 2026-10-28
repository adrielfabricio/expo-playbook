---
title: "Git and collaboration"
chapter: 17
tags: [git, commits, branches, pull-requests, conventional-commits, multi-repo]
applies_to: ["**"]
related: [00-principles.md, 16-environments-builds-releases.md, 19-agent-workflow.md]
last_updated: 2026-10-28
---

# Git and collaboration

## Agents do not commit

- **Nothing is committed, pushed, tagged, deployed or published unless the human explicitly asks.** No `git add`, `git commit`, `git push`, `git tag`, `eas build`/`submit`, `firebase deploy` or `wrangler deploy` on the agent's initiative.
- At the end of a change, hand the human the exact commands, one block per repository.
- Never `git init` a workspace folder that holds several repositories — it would nest them.
- Speckit never creates or switches branches ([`rules/speckit-policy.md`](../rules/speckit-policy.md)).

## Branches

`feature/*`, `fix/*`, `chore/*`. `main` is production-ready. A `develop` integration branch is optional per project.

## Commits

[Conventional Commits](https://www.conventionalcommits.org/), in English:

```
<type>(<scope>): <short description>

[optional body — WHY; the diff already shows what]

[optional footer: BREAKING CHANGE, closes #N]
```

Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `perf` (and `style` for formatting-only). Release commits: `chore(release): X.Y.Z`.

- A commit carries the code **and the docs it was written against** (`docs/`, `AGENTS.md`, `CLAUDE.md`, `.claude/rules/`).
- In a multi-repo workspace, a change touching two repositories is **two commits**, one per repository, and the side others depend on ships first (deploy the API/Worker or publish the site page before the app build that relies on it reaches the stores).
- Attribution trailers follow the project's own rule when it has one.

## Pull requests

- Roughly **≤ 400 lines changed** (excluding generated files). Past that, reviewers skim.
- Description: what changed, why, how to test; list the docs touched.
- Checks pass before review, not during.
