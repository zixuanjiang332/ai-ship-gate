# ReleaseGuard AI Rename Design

## Context

The project is currently named AI Ship Gate, with the npm package planned as `ai-ship-gate` and the primary CLI command implemented as `shipgate`.

The new public name is ReleaseGuard AI. This name better communicates the project's purpose: a deterministic release gate for AI-generated code that checks PR-sized git diffs before shipping.

Availability checks on May 6, 2026:

- `releaseguard-ai` is not published on npm.
- `releaseguard` is not published on npm.
- `zixuanjiang332/releaseguard-ai` does not exist yet on GitHub.
- GitHub search shows several unrelated repositories using `ReleaseGuard` or `releaseguard`, including one `releaseguard-ai` repository under another account with 0 stars.

The rename should reduce brand ambiguity by consistently pairing the name with the positioning line "deterministic PR diff release gate for AI-generated code."

## Goals

- Rename the public project from AI Ship Gate to ReleaseGuard AI.
- Make the published npm package name `releaseguard-ai`.
- Make the primary CLI command `releaseguard`.
- Keep `releaseguard-ai` as a CLI alias because it matches the npm package name and is easy to remember.
- Replace the config file with `releaseguard.config.yaml`.
- Update docs, examples, tests, generated `dist` files, and packaged file allowlist consistently.
- Preserve the current deterministic behavior: rules decide `PASS`, `WARN`, or `FAIL`; optional AI mode only explains findings.

## Non-Goals

- Do not publish to npm in the rename branch.
- Do not create a `v1` tag in the rename branch.
- Do not publish to GitHub Marketplace in the rename branch.
- Do not add unsupported features such as auto-fix, SARIF, dashboards, PR comments, or hosted services.
- Do not rename internal rule IDs unless the existing names create a user-visible brand mismatch.

## Naming System

| Surface | New Value |
| --- | --- |
| Product name | ReleaseGuard AI |
| GitHub repository target | `zixuanjiang332/releaseguard-ai` |
| npm package | `releaseguard-ai` |
| Primary CLI command | `releaseguard` |
| CLI alias | `releaseguard-ai` |
| Config file | `releaseguard.config.yaml` |
| Example config | `releaseguard.config.example.yaml` |
| Hero asset | `docs/assets/releaseguard-ai-hero.svg` |
| GitHub Action name | ReleaseGuard AI |
| Report heading | `ReleaseGuard AI: PASS`, `ReleaseGuard AI: WARN`, or `ReleaseGuard AI: FAIL` |
| AI timeout env var | `RELEASEGUARD_AI_TIMEOUT_MS` |

## Compatibility

Because the project has not been published to npm and no stable `v1` tag exists, the rename can be mostly clean.

The implementation should support one compatibility bridge:

- `SHIPGATE_AI_TIMEOUT_MS` may remain as a deprecated fallback for `RELEASEGUARD_AI_TIMEOUT_MS`.

The implementation should not keep `shipgate` as a CLI bin or `shipgate.config.yaml` as an accepted config file. Keeping those would dilute the public rename before the first release and create documentation complexity.

## User Experience

The README should lead with:

- `# ReleaseGuard AI`
- A concise subtitle: "A deterministic PR diff release gate for AI-generated code."
- A short positioning line that distinguishes the project from broader release platforms: ReleaseGuard AI checks source diffs for practical PR risks before merge.
- Quickstart commands that use local pre-v1 execution first:
  - `git clone https://github.com/zixuanjiang332/releaseguard-ai.git`
  - `cd releaseguard-ai`
  - `npm ci`
  - `npm run build`
  - `node dist/cli.js check --base HEAD`
- Planned npm path after publish:
  - `npx releaseguard-ai check`
- Installed CLI examples:
  - `releaseguard check --base main`
  - `releaseguard check --format markdown`
  - `releaseguard check --format json`
  - `releaseguard check --ai`
  - `releaseguard init`

The GitHub Action example should use:

```yaml
name: ReleaseGuard AI

on:
  pull_request:

jobs:
  releaseguard:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: zixuanjiang332/releaseguard-ai@main
        with:
          base: origin/main
          ai: false
```

Until the repository itself is renamed on GitHub, README links may temporarily point to the future target. The release checklist should call out the repository rename as a manual release-prep step.

## Implementation Scope

The rename should touch these file groups:

- Package metadata:
  - `package.json`
  - `package-lock.json`
- Action metadata:
  - `action.yml`
- Runtime source:
  - `src/cli.ts`
  - `src/config/loadConfig.ts`
  - `src/ai/explain.ts`
  - `src/reporters/markdown.ts`
  - `src/reporters/terminal.ts`
  - Type names in `src/domain/types.ts`, `src/config/defaults.ts`, `src/rules/engine.ts`, and `src/run.ts` if needed for consistency.
- Tests:
  - Update assertions, temp directory prefixes, env var tests, and config filename tests.
- Docs and examples:
  - `README.md`
  - `CONTRIBUTING.md`
  - `CHANGELOG.md`
  - `docs/release.md`
  - `docs/marketplace.md`
  - `examples/risky-diff.md`
  - Existing Superpowers specs/plans may remain as historical design records unless their current-facing examples confuse readers.
- Assets:
  - Rename and update the hero SVG title, visible product name, and command sample.
- Generated output:
  - Rebuild `dist` after source changes so the GitHub Action remains runnable from the repository.

## Testing

Before opening or merging the implementation PR, run:

```sh
npm test
npm run typecheck
npm run build
git diff --exit-code -- dist
npm pack --dry-run
node dist/cli.js check --base HEAD --format markdown
node dist/cli.js --help
```

Expected outcomes:

- Tests pass with all existing behavior preserved under the new name.
- TypeScript typecheck succeeds.
- Build succeeds and regenerated `dist` matches the checked-in bundle.
- Pack dry-run includes `README.md`, `LICENSE`, `action.yml`, `dist/action.js`, `dist/cli.js`, `releaseguard.config.example.yaml`, and the renamed hero asset.
- `node dist/cli.js --help` shows `releaseguard`.
- Markdown output starts with `# ReleaseGuard AI: PASS` when comparing `HEAD` to `HEAD`.

## Release Checklist Impact

The release checklist should include these manual steps after the rename branch is merged:

1. Rename the GitHub repository from `ai-ship-gate` to `releaseguard-ai`.
2. Confirm the CI badge and Action examples point to the renamed repository.
3. Log into npm.
4. Publish `releaseguard-ai`.
5. Create the first stable `v1` tag only after CI passes on `main`.
6. Draft the Marketplace listing only after the `v1` tag exists.

## Risks

- Name collision risk is moderate on GitHub because other unrelated ReleaseGuard projects exist. The README positioning should stay narrow and specific.
- A clean config filename rename is acceptable pre-v1, but users who tested the old branch locally will need to re-run `releaseguard init`.
- The repository rename is a manual GitHub operation and may temporarily leave README links ahead of the actual repository URL.

## Approval

The approved direction is ReleaseGuard AI with a clean pre-v1 rename, using `releaseguard-ai` for npm/repo identity and `releaseguard` as the primary CLI command.
