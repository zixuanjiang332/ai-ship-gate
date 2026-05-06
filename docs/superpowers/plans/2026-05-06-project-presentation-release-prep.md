# Project Presentation and Release Prep Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade AI Ship Gate's GitHub presentation and release-readiness without publishing npm, creating a v1 tag, or releasing to Marketplace.

**Architecture:** This plan adds documentation, a static SVG hero asset, and GitHub Actions CI around the existing CLI and Action runtime. Product behavior stays unchanged; release confidence comes from CI and docs that validate the current package and Action bundle.

**Tech Stack:** Markdown, SVG, GitHub Actions, Node.js 20, npm, Vitest, TypeScript, existing `npm run build`.

---

## File Structure

- `README.md`: GitHub-facing first screen, quickstart, demo, rules, Action usage, config, FAQ, roadmap.
- `package.json`: Package metadata, including MIT license declaration.
- `docs/assets/ship-gate-hero.svg`: Static GitHub-compatible visual asset using the approved black/color direction.
- `LICENSE`: MIT license for open-source reuse.
- `CONTRIBUTING.md`: Local development and contribution workflow.
- `CHANGELOG.md`: MVP release notes and future release format.
- `.github/PULL_REQUEST_TEMPLATE.md`: Lightweight PR checklist.
- `.github/workflows/ci.yml`: Push/PR verification for tests, typecheck, build, pack, and Action runtime smoke.
- `docs/release.md`: Manual pre-v1 and v1 release checklist.
- `docs/marketplace.md`: Explanation of GitHub Marketplace prompt and publish prerequisites.

---

### Task 1: Project Governance Docs

**Files:**
- Create: `LICENSE`
- Modify: `package.json`
- Create: `CONTRIBUTING.md`
- Create: `CHANGELOG.md`
- Create: `.github/PULL_REQUEST_TEMPLATE.md`
- Create: `docs/release.md`
- Create: `docs/marketplace.md`

- [ ] **Step 1: Create MIT license**

Create `LICENSE` with:

```text
MIT License

Copyright (c) 2026 zixuan Jiang

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

- [ ] **Step 2: Add package license metadata**

Modify `package.json` so the top-level metadata includes:

```json
{
  "name": "ai-ship-gate",
  "version": "0.1.0",
  "description": "A deterministic release gate for AI-generated code.",
  "license": "MIT",
  "type": "module"
}
```

Preserve the existing `bin`, `files`, `scripts`, `engines`, `dependencies`, and `devDependencies` blocks.

- [ ] **Step 3: Create contribution guide**

Create `CONTRIBUTING.md` with:

````markdown
# Contributing

Thanks for helping improve AI Ship Gate.

## Local Setup

```sh
npm ci
npm test
npm run typecheck
npm run build
```

## Development Checks

Before opening a pull request, run:

```sh
npm test
npm run typecheck
npm run build
npm pack --dry-run
```

The test suite includes a release-runtime smoke test for the bundled GitHub Action, so failures there should be treated as release blockers.

## Pull Requests

Use focused pull requests. Include:

- What changed.
- Why it changed.
- How you tested it.
- Whether release packaging is affected.

## Project Boundaries

AI Ship Gate is deterministic first. Optional AI output may explain findings, but it must not decide PASS, WARN, or FAIL.

Do not add claims for unsupported features such as auto-fix, SARIF, PR comments, SaaS, or dashboards unless the feature is implemented and tested.
````

- [ ] **Step 4: Create changelog**

Create `CHANGELOG.md` with:

```markdown
# Changelog

All notable changes to AI Ship Gate will be documented in this file.

## 0.1.0 - MVP

### Added

- `shipgate check` CLI for deterministic release-risk checks.
- `shipgate init` for `shipgate.config.yaml`.
- Git diff collection and project metadata detection.
- Rules for tests, dependencies, env files, CI/deploy/Docker changes, and secret-like values.
- Terminal, JSON, and Markdown reporters.
- Optional AI explanations that do not decide the final verdict.
- GitHub Action wrapper with a bundled runtime.
- Release-readiness tests for package contents and Action execution without `node_modules`.

### Release Status

This repository is currently pre-v1. The `v1` GitHub Action tag, npm publish, and Marketplace listing are planned release steps, not completed release actions.
```

- [ ] **Step 5: Create pull request template**

Create `.github/PULL_REQUEST_TEMPLATE.md` with:

```markdown
## Summary

- Change summary

## Test Plan

- [ ] `npm test`
- [ ] `npm run typecheck`
- [ ] `npm run build`
- [ ] `npm pack --dry-run`

## Release Impact

- [ ] No release packaging impact
- [ ] Updates `dist/`
- [ ] Updates GitHub Action behavior
- [ ] Updates docs only
```

- [ ] **Step 6: Create release checklist**

Create `docs/release.md` with:

````markdown
# Release Checklist

AI Ship Gate is currently pre-v1. Use this checklist before creating a public release.

## Before `v1`

Run:

```sh
npm ci
npm test
npm run typecheck
npm run build
npm pack --dry-run
```

Confirm:

- `dist/cli.js` is included in the npm package.
- `dist/action.js` is committed and bundled for GitHub Action users.
- `action.yml` points to `dist/action.js`.
- README does not claim unimplemented features.
- The Action example points to an existing tag before recommending `@v1` as stable.

## npm Publish

Publish only after package metadata, README, and license are final:

```sh
npm publish --access public
```

## GitHub Action Tag

Create the stable tag after the release commit is verified:

```sh
git tag v1
git push origin v1
```

## Marketplace

Draft the GitHub release after the `v1` tag exists. Review the Marketplace prompt, category, description, and branding before publishing.
````

- [ ] **Step 7: Create Marketplace note**

Create `docs/marketplace.md` with:

```markdown
# GitHub Marketplace Notes

GitHub shows a Marketplace banner because this repository contains `action.yml`.

Do not publish the Action to Marketplace until:

- A `v1` tag exists.
- The README Action example points to a real stable tag.
- CI is passing on `main`.
- The bundled `dist/action.js` runs without `node_modules`.
- The release notes explain what the Action checks and what it does not do.

Marketplace publishing is optional. The repository can still be used directly as a GitHub Action once a tag exists.
```

- [ ] **Step 8: Verify docs**

Run:

```sh
git add --intent-to-add LICENSE package.json CONTRIBUTING.md CHANGELOG.md .github/PULL_REQUEST_TEMPLATE.md docs/release.md docs/marketplace.md
git diff --check
```

Expected: exit 0.

- [ ] **Step 9: Commit governance docs**

Run:

```sh
git add LICENSE package.json CONTRIBUTING.md CHANGELOG.md .github/PULL_REQUEST_TEMPLATE.md docs/release.md docs/marketplace.md
git commit -m "docs: add project governance docs"
```

---

### Task 2: Visual README Asset

**Files:**
- Create: `docs/assets/ship-gate-hero.svg`

- [ ] **Step 1: Create asset directory**

Run:

```sh
mkdir docs/assets
```

On Windows PowerShell, use:

```powershell
New-Item -ItemType Directory -Force docs/assets
```

- [ ] **Step 2: Create the hero SVG**

Create `docs/assets/ship-gate-hero.svg` with a static SVG that:

- Uses a black foundation.
- Uses cyan, green, amber, coral, and subtle purple-blue glow.
- Shows code/diff texture.
- Shows `PASS`, `WARN`, and `FAIL`.
- Shows `npx ai-ship-gate check`.
- Does not load external fonts, scripts, or images.

Use this content:

```xml
<svg width="1280" height="640" viewBox="0 0 1280 640" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="title desc">
  <title id="title">AI Ship Gate hero</title>
  <desc id="desc">A dark code-themed hero image showing PASS, WARN, and FAIL release gate signals for AI-generated code.</desc>
  <defs>
    <radialGradient id="cyanGlow" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(260 130) rotate(35) scale(360 260)">
      <stop stop-color="#22d3ee" stop-opacity="0.34"/>
      <stop offset="1" stop-color="#22d3ee" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="roseGlow" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(1030 140) rotate(135) scale(340 250)">
      <stop stop-color="#fb7185" stop-opacity="0.25"/>
      <stop offset="1" stop-color="#fb7185" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="greenGlow" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(650 610) rotate(90) scale(360 260)">
      <stop stop-color="#4ade80" stop-opacity="0.22"/>
      <stop offset="1" stop-color="#4ade80" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="panel" x1="160" y1="72" x2="1120" y2="568" gradientUnits="userSpaceOnUse">
      <stop stop-color="#0f172a" stop-opacity="0.88"/>
      <stop offset="1" stop-color="#020617" stop-opacity="0.94"/>
    </linearGradient>
    <pattern id="grid" width="36" height="36" patternUnits="userSpaceOnUse">
      <path d="M36 0H0V36" stroke="#ffffff" stroke-opacity="0.045" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="1280" height="640" fill="#05070B"/>
  <rect width="1280" height="640" fill="url(#cyanGlow)"/>
  <rect width="1280" height="640" fill="url(#roseGlow)"/>
  <rect width="1280" height="640" fill="url(#greenGlow)"/>
  <rect width="1280" height="640" fill="url(#grid)"/>

  <g opacity="0.24" font-family="Consolas, 'SFMono-Regular', monospace" font-size="20" fill="#94a3b8">
    <text x="52" y="92">+ src/auth.ts</text>
    <text x="52" y="132">+ package.json</text>
    <text x="52" y="172">+ .github/workflows/deploy.yml</text>
    <text x="920" y="92">- missing tests</text>
    <text x="920" y="132">+ OPENAI_API_KEY</text>
    <text x="920" y="172">+ Dockerfile</text>
    <text x="78" y="548">diff --git a/src/config.ts b/src/config.ts</text>
    <text x="792" y="548">release gate: deterministic first</text>
  </g>

  <rect x="160" y="72" width="960" height="496" rx="28" fill="url(#panel)" stroke="#94a3b8" stroke-opacity="0.22"/>
  <rect x="160" y="72" width="960" height="72" rx="28" fill="#0B1220" fill-opacity="0.9"/>
  <path d="M160 144H1120" stroke="#ffffff" stroke-opacity="0.1"/>

  <text x="206" y="116" font-family="Inter, Arial, sans-serif" font-size="24" font-weight="700" fill="#F8FAFC">AI Ship Gate</text>
  <g font-family="Inter, Arial, sans-serif" font-size="16" font-weight="700">
    <text x="792" y="116" fill="#4ADE80">CI passing</text>
    <text x="908" y="116" fill="#38BDF8">npm ready</text>
    <text x="1032" y="116" fill="#F59E0B">Action ready</text>
  </g>

  <text x="640" y="226" text-anchor="middle" font-family="Consolas, 'SFMono-Regular', monospace" font-size="18" letter-spacing="3" fill="#64748B">DIFF RISK SIGNAL</text>
  <text x="640" y="292" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="48" font-weight="800" fill="#FFFFFF">Deterministic release gate</text>
  <text x="640" y="346" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="44" font-weight="800" fill="#E2E8F0">for AI-generated code</text>
  <text x="640" y="390" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="20" fill="#CBD5E1">Catch missing tests, dependency drift, env changes, CI/Docker risk, and secrets before a PR ships.</text>

  <g font-family="Inter, Arial, sans-serif" font-size="24" font-weight="900">
    <rect x="420" y="428" width="128" height="52" rx="10" fill="#4ADE80" fill-opacity="0.10" stroke="#4ADE80"/>
    <text x="484" y="462" text-anchor="middle" fill="#4ADE80">PASS</text>
    <rect x="576" y="428" width="128" height="52" rx="10" fill="#F59E0B" fill-opacity="0.10" stroke="#F59E0B"/>
    <text x="640" y="462" text-anchor="middle" fill="#F59E0B">WARN</text>
    <rect x="732" y="428" width="128" height="52" rx="10" fill="#FB7185" fill-opacity="0.10" stroke="#FB7185"/>
    <text x="796" y="462" text-anchor="middle" fill="#FB7185">FAIL</text>
  </g>

  <rect x="432" y="508" width="416" height="54" rx="12" fill="#0F172A" fill-opacity="0.88" stroke="#67E8F9" stroke-opacity="0.34"/>
  <text x="640" y="542" text-anchor="middle" font-family="Consolas, 'SFMono-Regular', monospace" font-size="22" fill="#67E8F9">npx ai-ship-gate check  -&gt;</text>
</svg>
```

- [ ] **Step 3: Verify asset has no external resources**

Run:

```sh
rg "<script|<image|href=|xlink:href|https://" docs/assets/ship-gate-hero.svg
rg "http://" docs/assets/ship-gate-hero.svg
```

Expected:

- First command exits 1 with no matches.
- Second command only prints the SVG namespace line containing `xmlns="http://www.w3.org/2000/svg"`.

- [ ] **Step 4: Commit visual asset**

Run:

```bash
git add docs/assets/ship-gate-hero.svg
git commit -m "docs: add README hero asset"
```

---

### Task 3: README Rewrite

**Files:**
- Modify: `README.md`
- Reference: `docs/assets/ship-gate-hero.svg`
- Reference: `examples/risky-diff.md`
- Reference: `docs/release.md`
- Reference: `docs/marketplace.md`

- [ ] **Step 1: Replace README content**

Replace `README.md` with:

````markdown
# AI Ship Gate

> A deterministic release gate for AI-generated code.

[![CI](https://github.com/zixuanjiang332/ai-ship-gate/actions/workflows/ci.yml/badge.svg)](https://github.com/zixuanjiang332/ai-ship-gate/actions/workflows/ci.yml)
[![GitHub Action](https://img.shields.io/badge/GitHub%20Action-ready-38bdf8)](action.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-4ade80.svg)](LICENSE)
[![Status](https://img.shields.io/badge/status-pre--v1-f59e0b)](docs/release.md)

![AI Ship Gate hero](docs/assets/ship-gate-hero.svg)

AI coding makes changes fast. Shipping still needs a gate.

AI Ship Gate checks a PR-sized git diff for practical release risks: missing tests, dependency drift, unsafe env changes, CI and Docker changes, and secret-like values. Rules decide `PASS`, `WARN`, or `FAIL`; optional AI mode only explains the findings.

## Quickstart

Run without installing:

```sh
npx ai-ship-gate check
```

After installing globally or using the package bin, the CLI command is `shipgate`:

```sh
shipgate check --base main
shipgate check --format markdown
shipgate check --format json
shipgate check --ai
shipgate init
```

`shipgate init` writes `shipgate.config.yaml`. It fails if that file already exists, so existing configuration is not overwritten.

## Example Output

```md
# AI Ship Gate: FAIL

## Findings

### WARN: Source changed without tests

- Rule: `tests.missing-related-tests`
- Files: `src/auth.ts`
- Reason: Source-like files changed, but this diff does not include test-like files.
- Suggestion: Add or update tests that cover the changed behavior before shipping.

### FAIL: Secret-like value in diff

- Rule: `security.secret-in-diff`
- Files: `src/config.ts`
- Reason: The diff contains a token, key, password, or secret-like value.
- Suggestion: Remove the value from git history if needed, rotate it, and use a safe example value.
```

See [examples/risky-diff.md](examples/risky-diff.md) for a compact PR scenario that triggers multiple rules.

## Verdicts

| Verdict | Meaning | Default CI behavior |
| --- | --- | --- |
| PASS | No warn or fail findings. | Exit 0 |
| WARN | Risk found. | Exit 0, does not block PRs by default |
| FAIL | High-risk issue found. | Exit 1 |

Set `failOn: warn` to make WARN verdicts exit 1 too.

## Rules

| Area | What it looks for | Example finding |
| --- | --- | --- |
| Test risk | Source-like changes without related test changes. | `tests.missing-related-tests` |
| Dependency risk | Manifest changes without matching lockfile updates, risky install scripts. | `dependencies.lockfile-not-updated` |
| Env risk | New env vars without examples, secret-like env values. | `env.example-not-updated` |
| CI/deploy/Docker risk | Deploy workflow changes and Dockerfiles without healthchecks. | `deploy.workflow-changed` |
| Security risk | Token, key, password, or secret-like values in the diff. | `security.secret-in-diff` |

## GitHub Action

In CI, prefer `origin/main` as the base ref after `actions/checkout`; local CLI runs commonly use `main`.

```yaml
name: AI Ship Gate

on:
  pull_request:

jobs:
  shipgate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: zixuanjiang332/ai-ship-gate@v1
        with:
          base: origin/main
          ai: false
```

`@v1` becomes valid after the first v1 release tag is created. Until then, use a commit SHA or branch for testing. See [docs/release.md](docs/release.md).

## Configuration

Create `shipgate.config.yaml` with `shipgate init`, or write one directly:

```yaml
failOn: fail
ai:
  enabled: false
checks:
  tests: true
  dependencies: true
  env: true
  ci: true
  docker: true
  security: true
```

## Optional AI Mode

```sh
OPENAI_API_KEY=... shipgate check --ai
```

AI mode reads deterministic findings and writes an explanation. It does not decide the verdict.

Environment variables:

| Variable | Purpose |
| --- | --- |
| `OPENAI_API_KEY` | Enables optional AI explanations. |
| `OPENAI_BASE_URL` | Overrides the OpenAI-compatible API base URL. |
| `OPENAI_MODEL` | Overrides the explanation model. |
| `SHIPGATE_AI_TIMEOUT_MS` | Bounds optional AI provider latency. |

## FAQ

### Does AI decide whether my PR passes?

No. Deterministic rules decide `PASS`, `WARN`, or `FAIL`. AI mode only explains those findings.

### Does this replace tests or code review?

No. It is a release gate for common risks in AI-generated diffs. It helps reviewers notice risky changes earlier.

### Why does GitHub show a Marketplace banner?

This repository contains `action.yml`, so GitHub recognizes it as an Action. Marketplace publishing is optional and should wait until a `v1` tag exists. See [docs/marketplace.md](docs/marketplace.md).

### Why use `fetch-depth: 0` in the Action example?

AI Ship Gate compares git refs. Full history makes base refs such as `origin/main` available in CI.

## Roadmap

- [ ] Publish `ai-ship-gate` to npm.
- [ ] Create a stable `v1` GitHub Action tag.
- [ ] Draft GitHub Marketplace listing.
- [ ] Add more language-aware risk heuristics.
- [ ] Add optional machine-readable annotations without changing deterministic verdicts.

## Release Status

AI Ship Gate is currently pre-v1. The CLI and Action are implemented and tested, but npm publish, `v1` tag creation, and Marketplace publishing are separate release steps.

See [docs/release.md](docs/release.md) for the release checklist.
````

- [ ] **Step 2: Verify README links**

Run:

```sh
rg "\\]\\(([^)#]+)\\)" README.md
```

Expected: links include existing local files and GitHub badge URLs.

- [ ] **Step 3: Verify unsupported claims are absent**

Run:

```sh
rg -i "auto-?fix|test generation|sarif|pull request comments|pr comments|saas|dashboard" README.md
```

Expected: exit 1 with no matches.

- [ ] **Step 4: Commit README rewrite**

Run:

```bash
git add README.md
git commit -m "docs: improve project README"
```

---

### Task 4: CI Release-Readiness Workflow

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Create CI workflow**

Create `.github/workflows/ci.yml` with:

```yaml
name: CI

on:
  push:
    branches:
      - main
  pull_request:

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - run: npm ci
      - run: npm test
      - run: npm run typecheck
      - run: npm run build
      - name: Verify generated dist is committed
        run: git diff --exit-code -- dist
      - run: npm pack --dry-run
      - name: Verify bundled Action runtime
        run: npx vitest run tests/action/action.test.ts
```

- [ ] **Step 2: Validate workflow syntax by inspection**

Run:

```sh
rg "npm ci|npm test|npm run typecheck|npm run build|git diff --exit-code -- dist|npm pack --dry-run|tests/action/action.test.ts" .github/workflows/ci.yml
```

Expected: all required commands are present.

- [ ] **Step 3: Commit CI workflow**

Run:

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add release readiness workflow"
```

---

### Task 5: Final Verification And Push

**Files:**
- Verify all files from Tasks 1-4.

- [ ] **Step 1: Run full verification**

Run:

```sh
npm test
npm run typecheck
npm run build
git diff --exit-code -- dist
node dist/cli.js --help
node dist/cli.js check --help
node dist/cli.js check --base HEAD --format markdown
npm pack --dry-run
git diff --check
```

Expected:

- Tests pass.
- Typecheck exits 0.
- Build exits 0.
- Generated `dist/` output is already committed.
- CLI help commands exit 0.
- `shipgate check --base HEAD --format markdown` outputs PASS.
- Pack dry-run includes `README.md`, `LICENSE`, `action.yml`, `dist/action.js`, `dist/cli.js`, and `shipgate.config.example.yaml`.
- `git diff --check` exits 0.

- [ ] **Step 2: Verify no release action happened**

Run:

```sh
git tag --list "v*"
```

Expected: no new tag created by this work.

- [ ] **Step 3: Verify git status**

Run:

```sh
git status --short --branch
```

Expected: clean worktree, ahead of `origin/main` by the new commits.

- [ ] **Step 4: Push to GitHub main after review approval**

Run:

```bash
git push origin HEAD:main
```

Expected: remote `main` updates successfully.

Do not push until task reviews are complete and the user has approved publishing the presentation update.
