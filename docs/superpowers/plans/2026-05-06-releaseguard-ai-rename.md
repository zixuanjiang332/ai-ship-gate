# ReleaseGuard AI Rename Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename the pre-v1 project from AI Ship Gate to ReleaseGuard AI across runtime, package metadata, tests, docs, visuals, and bundled Action output.

**Architecture:** This is a clean pre-v1 rename. Public identity changes to `ReleaseGuard AI`, npm package `releaseguard-ai`, CLI command `releaseguard`, CLI alias `releaseguard-ai`, and config file `releaseguard.config.yaml`. Runtime behavior remains deterministic; optional AI explanations remain explanatory only.

**Tech Stack:** TypeScript, Node.js 20, Commander, Vitest, esbuild, GitHub Actions metadata, checked-in bundled `dist`.

---

## File Structure

- Modify `package.json`: npm package name, bin aliases, package file allowlist, description.
- Modify `package-lock.json`: root package name and bin metadata after package metadata changes.
- Modify `action.yml`: Action display name and description.
- Modify `src/cli.ts`: CLI command name, init description, generated config filename, init success message.
- Modify `src/config/loadConfig.ts`: config filename and config type imports.
- Modify `src/config/defaults.ts`: config type import.
- Modify `src/domain/types.ts`: rename `ShipGateConfig` to `ReleaseGuardConfig`.
- Modify `src/rules/engine.ts`: config type import and rule config key type.
- Modify `src/run.ts`: config type import and helper type.
- Modify `src/ai/explain.ts`: use `RELEASEGUARD_AI_TIMEOUT_MS` with `SHIPGATE_AI_TIMEOUT_MS` as deprecated fallback.
- Modify `src/reporters/markdown.ts`: report heading product name.
- Modify `src/reporters/terminal.ts`: report heading product name.
- Modify `tests/reporters/reporters.test.ts`: expected report headings.
- Modify `tests/cli/run.test.ts`: report heading, temp prefixes, config filename.
- Modify `tests/config/loadConfig.test.ts`: temp prefix and config filename.
- Modify `tests/ai/explain.test.ts`: new timeout env var and deprecated fallback coverage.
- Modify `tests/action/action.test.ts`: mocked report headings, temp prefixes, release runtime assertion.
- Rename `shipgate.config.example.yaml` to `releaseguard.config.example.yaml`.
- Rename `docs/assets/ship-gate-hero.svg` to `docs/assets/releaseguard-ai-hero.svg`.
- Modify `README.md`: public name, badge URLs, quickstart, Action example, config file, env var table, roadmap, release status.
- Modify `CONTRIBUTING.md`: public name and project boundary wording.
- Modify `CHANGELOG.md`: public name and CLI/config entries.
- Modify `docs/release.md`: public name and manual repository rename checklist.
- Modify `docs/marketplace.md`: public name where useful.
- Modify `examples/risky-diff.md`: public name.
- Regenerate `dist/**`: bundled CLI, Action, declarations, and maps after source changes.

Historical Superpowers specs and plans may retain the old project name as history. Do not rewrite `docs/superpowers/specs/2026-05-05-ai-ship-gate-design.md` or `docs/superpowers/plans/2026-05-05-ai-ship-gate-mvp.md`.

---

### Task 1: Write Rename-Focused Failing Tests

**Files:**
- Modify: `tests/reporters/reporters.test.ts`
- Modify: `tests/cli/run.test.ts`
- Modify: `tests/config/loadConfig.test.ts`
- Modify: `tests/ai/explain.test.ts`
- Modify: `tests/action/action.test.ts`

- [ ] **Step 1: Update reporter assertions to the new product name**

In `tests/reporters/reporters.test.ts`, change the public heading assertions to:

```ts
expect(markdown).toContain("# ReleaseGuard AI: WARN");
expect(terminal).toContain("ReleaseGuard AI: WARN");
expect(renderMarkdown(passReport)).toContain("# ReleaseGuard AI: PASS");
expect(renderTerminal(passReport, { color: false })).toContain("ReleaseGuard AI: PASS");
```

- [ ] **Step 2: Update runCheck tests for the new report heading and config filename**

In `tests/cli/run.test.ts`, use these exact changed expectations and file names:

```ts
expect(write).toHaveBeenCalledWith(expect.stringContaining("# ReleaseGuard AI: WARN"));

const repoRoot = await mkdtemp(join(tmpdir(), "releaseguard-root-config-"));
await writeFile(join(repoRoot, "releaseguard.config.yaml"), "failOn: warn\n");

const repoRoot = await mkdtemp(join(tmpdir(), "releaseguard-disabled-check-"));
await writeFile(join(repoRoot, "releaseguard.config.yaml"), "checks:\n  tests: false\n");
```

When editing the second and fourth tests, keep the existing local variable name `repoRoot`; only the temp prefix and config filename change.

- [ ] **Step 3: Update config loader tests for the new config filename**

In `tests/config/loadConfig.test.ts`, change the temp prefix and every config path:

```ts
dir = join(tmpdir(), `releaseguard-config-${Date.now()}-${Math.random()}`);
await writeFile(join(dir, "releaseguard.config.yaml"), "failOn: warn\nai:\n  enabled: true\nchecks:\n  docker: false\n");
await writeFile(join(dir, "releaseguard.config.yaml"), "failOn: sometimes\n");
await writeFile(join(dir, "releaseguard.config.yaml"), "ai: true\n");
await writeFile(join(dir, "releaseguard.config.yaml"), "checks: []\n");
await writeFile(join(dir, "releaseguard.config.yaml"), 'checks:\n  docker: "false"\n');
await writeFile(join(dir, "releaseguard.config.yaml"), "checks:\n  tests: false\n  docker: false\n  security: false\n");
```

- [ ] **Step 4: Update AI timeout env var tests**

In `tests/ai/explain.test.ts`, change the timeout test env var to the new name:

```ts
env: {
  OPENAI_API_KEY: "test-key",
  RELEASEGUARD_AI_TIMEOUT_MS: "5",
},
```

Add this test after the timeout test to lock the deprecated fallback:

```ts
it("uses the deprecated SHIPGATE timeout env var as a fallback", async () => {
  vi.useFakeTimers();
  const fetch = vi.fn((_url: string | URL | Request, init?: RequestInit) => {
    return new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => {
        reject(new DOMException("The operation was aborted.", "AbortError"));
      });
    });
  });

  try {
    const summary = maybeExplainWithAi({
      enabled: true,
      report,
      env: {
        OPENAI_API_KEY: "test-key",
        SHIPGATE_AI_TIMEOUT_MS: "5",
      },
      fetch,
    });

    await vi.advanceTimersByTimeAsync(5);

    await expect(summary).resolves.toBeUndefined();
    expect(vi.getTimerCount()).toBe(0);
  } finally {
    vi.useRealTimers();
  }
});
```

- [ ] **Step 5: Update Action tests for new report headings and temp prefixes**

In `tests/action/action.test.ts`, update the setup and mocked rendered reports:

```ts
dir = await mkdtemp(join(tmpdir(), "releaseguard-action-"));

rendered: "# ReleaseGuard AI: WARN\n",
await expect(readFile(summaryPath, "utf8")).resolves.toContain("# ReleaseGuard AI: WARN");

rendered: "# ReleaseGuard AI: PASS\n",
rendered: "# ReleaseGuard AI: FAIL\n",

const releaseDir = await mkdtemp(join(tmpdir(), "releaseguard-release-"));
const workspaceDir = await mkdtemp(join(tmpdir(), "releaseguard-workspace-"));
await expect(readFile(releaseSummaryPath, "utf8")).resolves.toContain("# ReleaseGuard AI: PASS");
```

- [ ] **Step 6: Run tests and confirm the expected red state**

Run:

```sh
npm test
```

Expected: FAIL. The failures should point to old runtime strings such as `AI Ship Gate` or missing `releaseguard.config.yaml` support. If failures are syntax errors, fix the test edit before continuing.

---

### Task 2: Rename Runtime Source

**Files:**
- Modify: `src/domain/types.ts`
- Modify: `src/config/defaults.ts`
- Modify: `src/config/loadConfig.ts`
- Modify: `src/rules/engine.ts`
- Modify: `src/run.ts`
- Modify: `src/cli.ts`
- Modify: `src/ai/explain.ts`
- Modify: `src/reporters/markdown.ts`
- Modify: `src/reporters/terminal.ts`

- [ ] **Step 1: Rename the config interface**

In `src/domain/types.ts`, rename the interface declaration:

```ts
export interface ReleaseGuardConfig {
  failOn: FailOn;
  ai: {
    enabled: boolean;
  };
  checks: {
    tests: boolean;
    dependencies: boolean;
    ci: boolean;
    docker: boolean;
    env: boolean;
    security: boolean;
  };
}
```

- [ ] **Step 2: Update config type imports**

In `src/config/defaults.ts`, use:

```ts
import type { ReleaseGuardConfig } from "../domain/types.js";

export const defaultConfig: ReleaseGuardConfig = {
  failOn: "fail",
  ai: {
    enabled: false,
  },
  checks: {
    tests: true,
    dependencies: true,
    ci: true,
    docker: true,
    env: true,
    security: true,
  },
};
```

In `src/rules/engine.ts`, update the import and rule definition:

```ts
import type { Finding, GateContext, ReleaseGuardConfig } from "../domain/types.js";

export interface Rule {
  id: string;
  check: keyof ReleaseGuardConfig["checks"];
  evaluate(context: GateContext): Finding[];
}
```

In `src/run.ts`, update the type import and helper signature:

```ts
import type { CheckOptions, CheckResult, GateReport, ReleaseGuardConfig } from "./domain/types.js";

function isRuleEnabled(
  ruleCheck: keyof ReleaseGuardConfig["checks"],
  checks: ReleaseGuardConfig["checks"],
): boolean {
  return checks[ruleCheck];
}
```

- [ ] **Step 3: Change the config loader filename**

In `src/config/loadConfig.ts`, update the type names and filename constant:

```ts
import type { ReleaseGuardConfig } from "../domain/types.js";

type CheckName = keyof ReleaseGuardConfig["checks"];

interface ConfigInput {
  failOn?: ReleaseGuardConfig["failOn"];
  ai?: {
    enabled?: boolean;
  };
  checks?: Partial<Record<CheckName, boolean>>;
}

export const CONFIG_FILE_NAME = "releaseguard.config.yaml";

export async function loadConfig(cwd: string): Promise<ReleaseGuardConfig> {
  const path = join(cwd, CONFIG_FILE_NAME);
  let raw: string;
```

Also update the merge function signature:

```ts
export function mergeConfig(config: ConfigInput): ReleaseGuardConfig {
```

- [ ] **Step 4: Rename the CLI command and init output**

In `src/cli.ts`, update the program metadata and init command:

```ts
program
  .name("releaseguard")
  .description("A deterministic PR diff release gate for AI-generated code.")
  .version("0.1.0");
```

```ts
program
  .command("init")
  .description("Create a releaseguard.config.yaml file.")
  .action(async () => {
    const yaml = [
      `failOn: ${defaultConfig.failOn}`,
      "ai:",
      `  enabled: ${defaultConfig.ai.enabled}`,
      "checks:",
      `  tests: ${defaultConfig.checks.tests}`,
      `  dependencies: ${defaultConfig.checks.dependencies}`,
      `  ci: ${defaultConfig.checks.ci}`,
      `  docker: ${defaultConfig.checks.docker}`,
      `  env: ${defaultConfig.checks.env}`,
      `  security: ${defaultConfig.checks.security}`,
      "",
    ].join("\n");
    await writeFile("releaseguard.config.yaml", yaml, { flag: "wx" });
    console.log("Created releaseguard.config.yaml");
  });
```

- [ ] **Step 5: Rename report headings**

In `src/reporters/markdown.ts`, use:

```ts
const productName = "ReleaseGuard AI";

export function renderMarkdown(report: GateReport): string {
  const lines = [`# ${productName}: ${report.verdict.toUpperCase()}`, ""];
```

In `src/reporters/terminal.ts`, use:

```ts
const productName = "ReleaseGuard AI";

export function renderTerminal(report: GateReport, options: { color?: boolean } = {}): string {
  const color = options.color ?? true;
  const paint = color ? colorFor(report.verdict) : (value: string) => value;
  const lines = [paint(`${productName}: ${report.verdict.toUpperCase()}`), ""];
```

- [ ] **Step 6: Rename the AI timeout env var with fallback**

In `src/ai/explain.ts`, update `timeoutMs`:

```ts
function timeoutMs(env: Record<string, string | undefined>): number {
  const value = env.RELEASEGUARD_AI_TIMEOUT_MS ?? env.SHIPGATE_AI_TIMEOUT_MS;
  if (!value) return defaultTimeoutMs;

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return defaultTimeoutMs;
  return parsed;
}
```

- [ ] **Step 7: Run tests and typecheck**

Run:

```sh
npm test
npm run typecheck
```

Expected: both commands PASS. If typecheck reports leftover `ShipGateConfig`, update the missed import or type reference.

- [ ] **Step 8: Commit runtime rename**

Run:

```sh
git add src tests
git commit -m "refactor: rename runtime to ReleaseGuard AI"
```

---

### Task 3: Rename Package Metadata and Static Assets

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `action.yml`
- Rename: `shipgate.config.example.yaml` -> `releaseguard.config.example.yaml`
- Rename: `docs/assets/ship-gate-hero.svg` -> `docs/assets/releaseguard-ai-hero.svg`

- [ ] **Step 1: Rename files tracked by git**

Run:

```sh
git mv shipgate.config.example.yaml releaseguard.config.example.yaml
git mv docs/assets/ship-gate-hero.svg docs/assets/releaseguard-ai-hero.svg
```

- [ ] **Step 2: Update package metadata**

In `package.json`, set these fields:

```json
{
  "name": "releaseguard-ai",
  "description": "A deterministic PR diff release gate for AI-generated code.",
  "bin": {
    "releaseguard": "./dist/cli.js",
    "releaseguard-ai": "./dist/cli.js"
  },
  "files": [
    "dist",
    "action.yml",
    "README.md",
    "docs/assets/releaseguard-ai-hero.svg",
    "docs/release.md",
    "docs/marketplace.md",
    "examples/risky-diff.md",
    "releaseguard.config.example.yaml"
  ]
}
```

Keep the existing `version`, `license`, `type`, `scripts`, `engines`, `dependencies`, and `devDependencies` unchanged.

- [ ] **Step 3: Regenerate package-lock metadata**

Run:

```sh
npm install --package-lock-only
```

Expected: `package-lock.json` changes the root name to `releaseguard-ai` and the bin map to `releaseguard` plus `releaseguard-ai`.

- [ ] **Step 4: Update Action metadata**

In `action.yml`, use:

```yaml
name: ReleaseGuard AI
description: Deterministic PR diff release gate for AI-generated code.
inputs:
  base:
    description: Base ref to compare against.
    required: false
    default: origin/main
  ai:
    description: Enable optional AI explanation.
    required: false
    default: "false"
runs:
  using: node20
  main: dist/action.js
```

- [ ] **Step 5: Update the hero SVG identity**

In `docs/assets/releaseguard-ai-hero.svg`, update these visible strings:

```xml
<title id="title">ReleaseGuard AI hero</title>
```

```xml
<text x="206" y="116" font-family="Inter, Arial, sans-serif" font-size="24" font-weight="700" fill="#F8FAFC">ReleaseGuard AI</text>
```

```xml
<text x="640" y="542" text-anchor="middle" font-family="Consolas, 'SFMono-Regular', monospace" font-size="22" fill="#67E8F9">releaseguard check --base main  -&gt;</text>
```

If the longer `ReleaseGuard AI` text crowds the header controls, reduce the header control x positions by 40 px or reduce the product font size to 22. Keep all visible text inside the rounded panel.

- [ ] **Step 6: Run metadata verification**

Run:

```sh
npm run typecheck
npm test
```

Expected: both commands PASS.

- [ ] **Step 7: Commit metadata and assets**

Run:

```sh
git add package.json package-lock.json action.yml releaseguard.config.example.yaml docs/assets/releaseguard-ai-hero.svg
git add -u shipgate.config.example.yaml docs/assets/ship-gate-hero.svg
git commit -m "chore: rename package metadata to ReleaseGuard AI"
```

---

### Task 4: Rename Public Documentation

**Files:**
- Modify: `README.md`
- Modify: `CONTRIBUTING.md`
- Modify: `CHANGELOG.md`
- Modify: `docs/release.md`
- Modify: `docs/marketplace.md`
- Modify: `examples/risky-diff.md`

- [ ] **Step 1: Update README identity and badges**

In `README.md`, the opening section must become:

```md
# ReleaseGuard AI

> A deterministic PR diff release gate for AI-generated code.

[![CI](https://github.com/zixuanjiang332/releaseguard-ai/actions/workflows/ci.yml/badge.svg)](https://github.com/zixuanjiang332/releaseguard-ai/actions/workflows/ci.yml)
[![GitHub Action](https://img.shields.io/badge/GitHub%20Action-pre--v1-38bdf8)](action.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-4ade80.svg)](LICENSE)
[![Status](https://img.shields.io/badge/status-pre--v1-f59e0b)](docs/release.md)

![ReleaseGuard AI hero](docs/assets/releaseguard-ai-hero.svg)

AI coding makes changes fast. Shipping still needs a release gate.

ReleaseGuard AI checks a PR-sized git diff for practical release risks before merge: missing tests, dependency drift, unsafe env changes, CI and Docker changes, and secret-like values. Rules decide `PASS`, `WARN`, or `FAIL`; optional AI mode only explains the findings.
```

- [ ] **Step 2: Update README quickstart and CLI examples**

In `README.md`, use these commands:

```sh
git clone https://github.com/zixuanjiang332/releaseguard-ai.git
cd releaseguard-ai
npm ci
npm run build
node dist/cli.js check --base HEAD
```

```sh
node dist/cli.js check --base main
node dist/cli.js check --format markdown
node dist/cli.js check --format json
node dist/cli.js check --ai
node dist/cli.js init
```

Change the npm publish note to:

```md
The npm package is not published yet. After npm publish, the planned zero-install path is `npx releaseguard-ai check`.
```

Change the init note to:

```md
`node dist/cli.js init` writes `releaseguard.config.yaml`. It fails if that file already exists, so existing configuration is not overwritten.
```

- [ ] **Step 3: Update README output, Action, config, env, and roadmap**

In `README.md`, update the example output heading:

```md
# ReleaseGuard AI: FAIL
```

Use this Action example:

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

Use this config intro:

```md
Create `releaseguard.config.yaml` with `node dist/cli.js init`, or write one directly:
```

Change the env var table entry:

```md
| `RELEASEGUARD_AI_TIMEOUT_MS` | Bounds optional AI provider latency. |
```

Change the roadmap publish item:

```md
- [ ] Publish `releaseguard-ai` to npm.
```

Change release status references from AI Ship Gate to ReleaseGuard AI.

- [ ] **Step 4: Update contributing and changelog**

In `CONTRIBUTING.md`, use:

```md
Thanks for helping improve ReleaseGuard AI.
```

```md
ReleaseGuard AI is deterministic first. Optional AI output may explain findings, but it must not decide PASS, WARN, or FAIL.
```

In `CHANGELOG.md`, use:

```md
All notable changes to ReleaseGuard AI will be documented in this file.
```

```md
- `releaseguard check` CLI for deterministic release-risk checks.
- `releaseguard init` for `releaseguard.config.yaml`.
```

- [ ] **Step 5: Update release and Marketplace docs**

In `docs/release.md`, change the opening to:

```md
ReleaseGuard AI is currently pre-v1. Use this checklist before creating a public release.
```

Add these confirmation bullets under "Before `v1`":

```md
- The GitHub repository has been renamed from `ai-ship-gate` to `releaseguard-ai`.
- The CI badge and Action examples point to `zixuanjiang332/releaseguard-ai`.
```

In `docs/marketplace.md`, keep the existing structure and make this sentence explicit:

```md
Marketplace publishing is optional. ReleaseGuard AI can still be used directly as a GitHub Action once a tag exists.
```

- [ ] **Step 6: Update example scenario**

In `examples/risky-diff.md`, change the first project-name sentence to:

```md
This demo describes a PR that should be stopped by ReleaseGuard AI before it ships:
```

- [ ] **Step 7: Search for stale public names**

Run:

```sh
rg -n "AI Ship Gate|ai-ship-gate|shipgate|SHIPGATE|ShipGate" README.md CONTRIBUTING.md CHANGELOG.md action.yml package.json package-lock.json docs/release.md docs/marketplace.md examples src tests releaseguard.config.example.yaml docs/assets/releaseguard-ai-hero.svg
```

Expected remaining matches:

```text
src/ai/explain.ts: fallback reference to SHIPGATE_AI_TIMEOUT_MS
tests/ai/explain.test.ts: fallback test reference to SHIPGATE_AI_TIMEOUT_MS
```

No other matches should remain in current-facing files.

- [ ] **Step 8: Run documentation-adjacent checks**

Run:

```sh
npm test
npm run typecheck
```

Expected: both commands PASS.

- [ ] **Step 9: Commit documentation rename**

Run:

```sh
git add README.md CONTRIBUTING.md CHANGELOG.md docs/release.md docs/marketplace.md examples/risky-diff.md
git commit -m "docs: rename public docs to ReleaseGuard AI"
```

---

### Task 5: Regenerate Bundled Output and Verify Release Readiness

**Files:**
- Modify: `dist/**`

- [ ] **Step 1: Build the TypeScript and bundled Action output**

Run:

```sh
npm run build
```

Expected: PASS. `dist/cli.js`, `dist/action.js`, source maps, and declarations update with the new naming.

- [ ] **Step 2: Verify generated output contains the new names**

Run:

```sh
rg -n "ReleaseGuard AI|releaseguard.config.yaml|RELEASEGUARD_AI_TIMEOUT_MS|releaseguard" dist/action.js dist/cli.js dist/config dist/reporters dist/ai
```

Expected: matches show the new Action/CLI/report/config/env strings.

Run:

```sh
rg -n "AI Ship Gate|ai-ship-gate|shipgate.config.yaml|\\.name\\(\"shipgate\"\\)" dist/action.js dist/cli.js dist/config dist/reporters dist/ai
```

Expected: no matches.

- [ ] **Step 3: Run the full verification suite**

Run:

```sh
npm test
npm run typecheck
npm run build
npm pack --dry-run
node dist/cli.js check --base HEAD --format markdown
node dist/cli.js --help
```

Expected:

- `npm test` PASS.
- `npm run typecheck` PASS.
- `npm run build` PASS.
- `npm pack --dry-run` lists `README.md`, `LICENSE`, `action.yml`, `dist/action.js`, `dist/cli.js`, `releaseguard.config.example.yaml`, and `docs/assets/releaseguard-ai-hero.svg`.
- `node dist/cli.js check --base HEAD --format markdown` prints a heading that starts with `# ReleaseGuard AI:`.
- `node dist/cli.js --help` includes `Usage: releaseguard`.

- [ ] **Step 4: Confirm package metadata from npm pack**

Run:

```sh
npm pack --json --dry-run
```

Expected: JSON output includes `"name": "releaseguard-ai"` and file entries for:

```text
package/dist/cli.js
package/dist/action.js
package/action.yml
package/README.md
package/LICENSE
package/releaseguard.config.example.yaml
package/docs/assets/releaseguard-ai-hero.svg
```

- [ ] **Step 5: Check final git state**

Run:

```sh
git status --short --branch
git diff --stat
```

Expected: only intended rename implementation files are modified. There should be no unrelated files outside the file structure list.

- [ ] **Step 6: Commit regenerated output**

Run:

```sh
git add dist
git commit -m "build: regenerate ReleaseGuard AI artifacts"
```

---

### Task 6: Prepare Pull Request

**Files:**
- No file edits expected.

- [ ] **Step 1: Re-run final verification after all commits**

Run:

```sh
npm test
npm run typecheck
npm run build
git diff --exit-code -- dist
npm pack --dry-run
node dist/cli.js check --base HEAD --format markdown
node dist/cli.js --help
```

Expected:

- All commands exit 0.
- `git diff --exit-code -- dist` exits 0, so the committed bundle matches the source after a fresh build.
- Markdown check output starts with `# ReleaseGuard AI:`.
- Help output includes `Usage: releaseguard`.

- [ ] **Step 2: Push the branch**

Run:

```sh
git status --short --branch
git push -u origin codex/releaseguard-ai-rename
```

Expected: branch pushes successfully and tracks `origin/codex/releaseguard-ai-rename`.

- [ ] **Step 3: Open a ready pull request**

Use this PR title:

```text
Rename project to ReleaseGuard AI
```

Use this PR body:

```md
## Summary
- Rename public project identity from AI Ship Gate to ReleaseGuard AI.
- Rename package metadata, CLI command, config filename, Action metadata, docs, examples, and hero asset.
- Preserve deterministic verdict behavior while keeping `SHIPGATE_AI_TIMEOUT_MS` as a deprecated timeout fallback.

## Testing
- npm test
- npm run typecheck
- npm run build
- npm pack --dry-run
- node dist/cli.js check --base HEAD --format markdown
- node dist/cli.js --help

## Release impact
- Pre-v1 breaking rename: package becomes `releaseguard-ai`, primary CLI becomes `releaseguard`, and config becomes `releaseguard.config.yaml`.
- Manual follow-up after merge: rename the GitHub repository to `releaseguard-ai` before npm publish or v1 tagging.
```

- [ ] **Step 4: Watch CI**

Run:

```sh
gh pr checks --watch
```

Expected: required `verify` check passes before merge.
