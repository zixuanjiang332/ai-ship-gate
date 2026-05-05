# AI Ship Gate MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first working AI Ship Gate release: a deterministic CLI and GitHub Action that checks git diffs for release risk and optionally adds AI-generated explanations.

**Architecture:** The CLI owns all core behavior. Git collection normalizes changed files and patch content into a `GateContext`, deterministic rules produce structured findings, reporters render those findings, and optional AI mode only summarizes rule output. The GitHub Action is a thin wrapper around the same runner so local and CI behavior match.

**Tech Stack:** TypeScript, Node.js ESM, Commander, YAML, Picocolors, Vitest, GitHub composite/action metadata.

---

## File Structure

Create these files:

- `package.json`: npm metadata, bin entry, scripts, dependencies.
- `tsconfig.json`: TypeScript compiler settings.
- `vitest.config.ts`: Vitest configuration.
- `.gitignore`: generated files and dependency folders.
- `README.md`: project overview, quickstart, Action usage, rule examples.
- `action.yml`: GitHub Action metadata.
- `dist/`: generated JavaScript committed for the GitHub Action release path after `npm run build`.
- `shipgate.config.example.yaml`: visible example config for README users.
- `src/cli.ts`: executable CLI entrypoint.
- `src/run.ts`: orchestrates config, git context, rules, AI, reporters, and exit behavior.
- `src/config/defaults.ts`: default config and config types.
- `src/config/loadConfig.ts`: reads and merges `shipgate.config.yaml`.
- `src/domain/types.ts`: shared public types for verdicts, findings, context, reports, and options.
- `src/domain/verdict.ts`: verdict aggregation and exit decision helpers.
- `src/git/git.ts`: repository detection, base ref resolution, changed file and diff collection.
- `src/project/classify.ts`: path and patch classifiers used by rules.
- `src/rules/engine.ts`: rule interface and enabled-rule runner.
- `src/rules/tests.ts`: test-risk rules.
- `src/rules/dependencies.ts`: dependency-risk rules.
- `src/rules/env.ts`: environment-variable and secret-file rules.
- `src/rules/ciDeploy.ts`: CI, Docker, and deploy config rules.
- `src/rules/security.ts`: security-sensitive change rules.
- `src/rules/index.ts`: default rule registry.
- `src/reporters/terminal.ts`: human terminal output.
- `src/reporters/json.ts`: JSON output.
- `src/reporters/markdown.ts`: Markdown output for GitHub summaries.
- `src/reporters/index.ts`: reporter selection.
- `src/ai/explain.ts`: optional OpenAI-compatible summary provider.
- `src/action.ts`: GitHub Action entrypoint that writes `$GITHUB_STEP_SUMMARY`.
- `tests/domain/verdict.test.ts`: verdict tests.
- `tests/project/classify.test.ts`: classifier tests.
- `tests/rules/*.test.ts`: rule tests.
- `tests/reporters/*.test.ts`: reporter tests.
- `tests/config/loadConfig.test.ts`: config tests.
- `tests/cli/run.test.ts`: orchestration tests with mocked git context.

Modify these files:

- `docs/superpowers/specs/2026-05-05-ai-ship-gate-design.md`: only if implementation discoveries require a user-approved spec correction.

---

### Task 1: Project Scaffold

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `.gitignore`
- Create: `src/cli.ts`
- Create: `src/run.ts`
- Create: `src/domain/types.ts`
- Create: `tests/domain/verdict.test.ts`

- [ ] **Step 1: Write the first failing test for verdict aggregation**

Create `tests/domain/verdict.test.ts` with:

```ts
import { describe, expect, it } from "vitest";
import { aggregateVerdict, shouldExitWithFailure } from "../../src/domain/verdict.js";
import type { Finding } from "../../src/domain/types.js";

const finding = (severity: Finding["severity"]): Finding => ({
  id: `test.${severity}`,
  severity,
  title: `${severity} title`,
  message: `${severity} message`,
  files: ["src/example.ts"],
  suggestion: "Review the finding.",
});

describe("aggregateVerdict", () => {
  it("returns fail when any finding fails", () => {
    expect(aggregateVerdict([finding("warn"), finding("fail")])).toBe("fail");
  });

  it("returns warn when findings warn but none fail", () => {
    expect(aggregateVerdict([finding("info"), finding("warn")])).toBe("warn");
  });

  it("returns pass when there are no warnings or failures", () => {
    expect(aggregateVerdict([finding("info")])).toBe("pass");
    expect(aggregateVerdict([])).toBe("pass");
  });
});

describe("shouldExitWithFailure", () => {
  it("uses fail as the default blocking threshold", () => {
    expect(shouldExitWithFailure("warn", "fail")).toBe(false);
    expect(shouldExitWithFailure("fail", "fail")).toBe(true);
  });

  it("can make warnings block CI", () => {
    expect(shouldExitWithFailure("warn", "warn")).toBe(true);
    expect(shouldExitWithFailure("pass", "warn")).toBe(false);
  });
});
```

- [ ] **Step 2: Add package and test tooling**

Create `package.json` with:

```json
{
  "name": "ai-ship-gate",
  "version": "0.1.0",
  "description": "A deterministic release gate for AI-generated code.",
  "type": "module",
  "bin": {
    "shipgate": "./dist/cli.js"
  },
  "files": [
    "dist",
    "action.yml",
    "README.md",
    "shipgate.config.example.yaml"
  ],
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  },
  "engines": {
    "node": ">=20"
  },
  "dependencies": {
    "commander": "^12.1.0",
    "picocolors": "^1.1.1",
    "yaml": "^2.8.0"
  },
  "devDependencies": {
    "@types/node": "^22.15.0",
    "typescript": "^5.8.0",
    "vitest": "^3.1.0"
  }
}
```

Create `tsconfig.json` with:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "rootDir": ".",
    "outDir": "dist",
    "declaration": true,
    "sourceMap": true
  },
  "include": ["src/**/*.ts"],
  "exclude": ["dist", "node_modules", "tests"]
}
```

Create `vitest.config.ts` with:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
  },
});
```

Create `.gitignore` with:

```gitignore
node_modules/
coverage/
.env
.env.*
!.env.example
shipgate.config.yaml
```

- [ ] **Step 3: Install dependencies**

Run:

```bash
npm install
```

Expected: `package-lock.json` is created and npm reports installed packages without vulnerabilities that block local development.

- [ ] **Step 4: Run the test and verify it fails because implementation files do not exist**

Run:

```bash
npm test -- tests/domain/verdict.test.ts
```

Expected: FAIL with an import error for `src/domain/verdict.js` or `src/domain/types.js`.

- [ ] **Step 5: Add shared types and verdict implementation**

Create `src/domain/types.ts` with:

```ts
export type Severity = "info" | "warn" | "fail";
export type Verdict = "pass" | "warn" | "fail";
export type FailOn = "warn" | "fail";
export type OutputFormat = "terminal" | "json" | "markdown";

export interface Finding {
  id: string;
  severity: Severity;
  title: string;
  message: string;
  files: string[];
  suggestion: string;
}

export interface ChangedFile {
  path: string;
  status: "added" | "modified" | "deleted" | "renamed" | "unknown";
  patch: string;
}

export interface ProjectMetadata {
  hasPackageJson: boolean;
  hasPackageLock: boolean;
  hasPnpmLock: boolean;
  hasYarnLock: boolean;
  hasPyproject: boolean;
  hasRequirements: boolean;
  hasGoMod: boolean;
  hasCargoToml: boolean;
  hasPomXml: boolean;
  hasDockerfile: boolean;
  hasCompose: boolean;
  hasGitHubActions: boolean;
  hasEnvExample: boolean;
}

export interface GateContext {
  repoRoot: string;
  baseRef: string;
  changedFiles: ChangedFile[];
  metadata: ProjectMetadata;
}

export interface ShipGateConfig {
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

export interface GateReport {
  verdict: Verdict;
  findings: Finding[];
  aiSummary?: string;
}

export interface CheckOptions {
  cwd: string;
  base?: string;
  format: OutputFormat;
  ai: boolean;
}
```

Create `src/domain/verdict.ts` with:

```ts
import type { FailOn, Finding, Verdict } from "./types.js";

const rank: Record<Verdict, number> = {
  pass: 0,
  warn: 1,
  fail: 2,
};

export function aggregateVerdict(findings: Finding[]): Verdict {
  if (findings.some((finding) => finding.severity === "fail")) {
    return "fail";
  }

  if (findings.some((finding) => finding.severity === "warn")) {
    return "warn";
  }

  return "pass";
}

export function shouldExitWithFailure(verdict: Verdict, failOn: FailOn): boolean {
  return rank[verdict] >= rank[failOn];
}
```

Create `src/run.ts` with:

```ts
import type { CheckOptions, GateReport } from "./domain/types.js";

export async function runCheck(_options: CheckOptions): Promise<GateReport> {
  return {
    verdict: "pass",
    findings: [],
  };
}
```

Create `src/cli.ts` with:

```ts
#!/usr/bin/env node
import { Command } from "commander";
import { runCheck } from "./run.js";

const program = new Command();

program
  .name("shipgate")
  .description("A deterministic release gate for AI-generated code.")
  .version("0.1.0");

program
  .command("check")
  .description("Check the current git diff for release risk.")
  .option("--base <ref>", "Base ref to compare against")
  .option("--format <format>", "Output format: terminal, json, markdown", "terminal")
  .option("--ai", "Enable optional AI explanation", false)
  .action(async (options: { base?: string; format: "terminal" | "json" | "markdown"; ai: boolean }) => {
    await runCheck({
      cwd: process.cwd(),
      base: options.base,
      format: options.format,
      ai: options.ai,
    });
  });

program.parseAsync(process.argv).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
```

- [ ] **Step 6: Run test and typecheck**

Run:

```bash
npm test -- tests/domain/verdict.test.ts
npm run typecheck
```

Expected: both commands PASS.

- [ ] **Step 7: Commit scaffold**

Run:

```bash
git add package.json package-lock.json tsconfig.json vitest.config.ts .gitignore src tests
git commit -m "chore: scaffold TypeScript CLI project"
```

Expected: commit succeeds and `git status --short` shows no scaffold files left unstaged.

---

### Task 2: Project Classification Helpers

**Files:**
- Create: `src/project/classify.ts`
- Test: `tests/project/classify.test.ts`

- [ ] **Step 1: Write failing classifier tests**

Create `tests/project/classify.test.ts` with:

```ts
import { describe, expect, it } from "vitest";
import {
  isCiOrDeployPath,
  isDependencyManifest,
  isEnvExamplePath,
  isLockfile,
  isSourcePath,
  isTestPath,
  patchAddsEnvUsage,
  patchAddsFocusedOrSkippedTest,
  patchContainsSecret,
  touchesSecuritySensitiveArea,
} from "../../src/project/classify.js";

describe("path classifiers", () => {
  it("detects source and test paths", () => {
    expect(isSourcePath("src/server/auth.ts")).toBe(true);
    expect(isSourcePath("README.md")).toBe(false);
    expect(isTestPath("src/server/auth.test.ts")).toBe(true);
    expect(isTestPath("tests/auth.spec.ts")).toBe(true);
  });

  it("detects dependency and lock files", () => {
    expect(isDependencyManifest("package.json")).toBe(true);
    expect(isDependencyManifest("pyproject.toml")).toBe(true);
    expect(isLockfile("package-lock.json")).toBe(true);
    expect(isLockfile("poetry.lock")).toBe(true);
  });

  it("detects env examples and CI/deploy paths", () => {
    expect(isEnvExamplePath(".env.example")).toBe(true);
    expect(isCiOrDeployPath(".github/workflows/ci.yml")).toBe(true);
    expect(isCiOrDeployPath("Dockerfile")).toBe(true);
  });

  it("detects security-sensitive paths", () => {
    expect(touchesSecuritySensitiveArea("src/auth/session.ts", "")).toBe(true);
    expect(touchesSecuritySensitiveArea("src/routes/upload.ts", "")).toBe(true);
    expect(touchesSecuritySensitiveArea("src/components/Button.tsx", "")).toBe(false);
  });
});

describe("patch classifiers", () => {
  it("detects focused or skipped tests", () => {
    expect(patchAddsFocusedOrSkippedTest("+it.only('works', () => {})")).toBe(true);
    expect(patchAddsFocusedOrSkippedTest("+describe.skip('slow', () => {})")).toBe(true);
  });

  it("detects env usage", () => {
    expect(patchAddsEnvUsage("+const key = process.env.OPENAI_API_KEY;")).toBe(true);
    expect(patchAddsEnvUsage("+token = os.environ['TOKEN']")).toBe(true);
  });

  it("detects likely secrets", () => {
    expect(patchContainsSecret("+OPENAI_API_KEY=sk-1234567890abcdef1234567890abcdef")).toBe(true);
    expect(patchContainsSecret("+const label = 'safe';")).toBe(false);
  });
});
```

- [ ] **Step 2: Run classifier test and verify it fails**

Run:

```bash
npm test -- tests/project/classify.test.ts
```

Expected: FAIL because `src/project/classify.ts` does not exist.

- [ ] **Step 3: Implement focused classifiers**

Create `src/project/classify.ts` with:

```ts
const sourcePrefixes = ["src/", "app/", "lib/", "server/", "packages/"];
const testPattern = /(^|\/)(__tests__|tests?)\/|(\.|-)(test|spec)\.[cm]?[jt]sx?$/i;
const dependencyManifests = new Set([
  "package.json",
  "requirements.txt",
  "pyproject.toml",
  "go.mod",
  "Cargo.toml",
  "pom.xml",
]);
const lockfiles = new Set([
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock",
  "poetry.lock",
  "uv.lock",
  "go.sum",
  "Cargo.lock",
]);
const envExamples = new Set([".env.example", ".env.sample", "env.example"]);
const securityTerms = [
  "auth",
  "permission",
  "permissions",
  "role",
  "roles",
  "payment",
  "stripe",
  "crypto",
  "cors",
  "sql",
  "query",
  "upload",
  "token",
  "session",
];

function normalize(path: string): string {
  return path.replaceAll("\\", "/");
}

export function isSourcePath(path: string): boolean {
  const normalized = normalize(path);
  return sourcePrefixes.some((prefix) => normalized.startsWith(prefix)) && !isTestPath(normalized);
}

export function isTestPath(path: string): boolean {
  return testPattern.test(normalize(path));
}

export function isDependencyManifest(path: string): boolean {
  return dependencyManifests.has(normalize(path));
}

export function isLockfile(path: string): boolean {
  return lockfiles.has(normalize(path));
}

export function isEnvExamplePath(path: string): boolean {
  return envExamples.has(normalize(path)) || normalize(path).endsWith("/.env.example");
}

export function isCiOrDeployPath(path: string): boolean {
  const normalized = normalize(path);
  return (
    normalized.startsWith(".github/workflows/") ||
    normalized === "Dockerfile" ||
    normalized.endsWith("/Dockerfile") ||
    normalized === "docker-compose.yml" ||
    normalized === "docker-compose.yaml" ||
    normalized.includes("/deploy/") ||
    normalized.includes("/deployment/")
  );
}

export function patchAddsFocusedOrSkippedTest(patch: string): boolean {
  return addedLines(patch).some((line) => /\.(only|skip)\s*\(|\b(xit|fit)\s*\(/.test(line));
}

export function patchAddsEnvUsage(patch: string): boolean {
  return addedLines(patch).some((line) =>
    /(process\.env\.[A-Z0-9_]+|process\.env\[['"][A-Z0-9_]+['"]\]|os\.environ\[['"][A-Z0-9_]+['"]\]|getenv\(['"][A-Z0-9_]+['"]\))/.test(
      line,
    ),
  );
}

export function patchContainsSecret(patch: string): boolean {
  return addedLines(patch).some((line) =>
    /(api[_-]?key|secret|token|password)\s*[:=]\s*['"]?[A-Za-z0-9_\-]{20,}|sk-[A-Za-z0-9]{20,}/i.test(line),
  );
}

export function touchesSecuritySensitiveArea(path: string, patch: string): boolean {
  const haystack = `${normalize(path)}\n${patch}`.toLowerCase();
  return securityTerms.some((term) => haystack.includes(term));
}

function addedLines(patch: string): string[] {
  return patch
    .split(/\r?\n/)
    .filter((line) => line.startsWith("+") && !line.startsWith("+++"));
}
```

- [ ] **Step 4: Run classifier tests**

Run:

```bash
npm test -- tests/project/classify.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit classifiers**

Run:

```bash
git add src/project/classify.ts tests/project/classify.test.ts
git commit -m "feat: add project classification helpers"
```

Expected: commit succeeds.

---

### Task 3: Rule Engine and Test Risk Rules

**Files:**
- Create: `src/rules/engine.ts`
- Create: `src/rules/tests.ts`
- Create: `src/rules/index.ts`
- Test: `tests/rules/tests.test.ts`

- [ ] **Step 1: Write failing test-risk rule tests**

Create `tests/rules/tests.test.ts` with:

```ts
import { describe, expect, it } from "vitest";
import type { GateContext } from "../../src/domain/types.js";
import { runRules } from "../../src/rules/engine.js";
import { testRiskRule } from "../../src/rules/tests.js";

const context = (changedFiles: GateContext["changedFiles"]): GateContext => ({
  repoRoot: "/repo",
  baseRef: "main",
  changedFiles,
  metadata: {
    hasPackageJson: false,
    hasPackageLock: false,
    hasPnpmLock: false,
    hasYarnLock: false,
    hasPyproject: false,
    hasRequirements: false,
    hasGoMod: false,
    hasCargoToml: false,
    hasPomXml: false,
    hasDockerfile: false,
    hasCompose: false,
    hasGitHubActions: false,
    hasEnvExample: false,
  },
});

describe("testRiskRule", () => {
  it("warns when source changes do not include test changes", () => {
    const findings = testRiskRule.run(
      context([{ path: "src/auth.ts", status: "modified", patch: "+export const ok = true;" }]),
    );

    expect(findings).toContainEqual(
      expect.objectContaining({
        id: "tests.missing-related-tests",
        severity: "warn",
      }),
    );
  });

  it("does not warn when tests change with source", () => {
    const findings = testRiskRule.run(
      context([
        { path: "src/auth.ts", status: "modified", patch: "+export const ok = true;" },
        { path: "src/auth.test.ts", status: "modified", patch: "+it('works', () => {})" },
      ]),
    );

    expect(findings.some((finding) => finding.id === "tests.missing-related-tests")).toBe(false);
  });

  it("fails focused tests and warns skipped tests", () => {
    const findings = testRiskRule.run(
      context([
        { path: "src/auth.test.ts", status: "modified", patch: "+it.only('works', () => {})" },
        { path: "src/payment.test.ts", status: "modified", patch: "+describe.skip('slow', () => {})" },
      ]),
    );

    expect(findings).toContainEqual(expect.objectContaining({ id: "tests.focused-test", severity: "fail" }));
    expect(findings).toContainEqual(expect.objectContaining({ id: "tests.skipped-test", severity: "warn" }));
  });
});

describe("runRules", () => {
  it("runs enabled rules", () => {
    const findings = runRules(context([{ path: "src/app.ts", status: "modified", patch: "+x" }]), [testRiskRule]);
    expect(findings.map((finding) => finding.id)).toContain("tests.missing-related-tests");
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run:

```bash
npm test -- tests/rules/tests.test.ts
```

Expected: FAIL because the rule files do not exist.

- [ ] **Step 3: Implement rule engine and test-risk rule**

Create `src/rules/engine.ts` with:

```ts
import type { Finding, GateContext, ShipGateConfig } from "../domain/types.js";

export interface Rule {
  id: string;
  check: keyof ShipGateConfig["checks"];
  run(context: GateContext): Finding[];
}

export function runRules(context: GateContext, rules: Rule[]): Finding[] {
  return rules.flatMap((rule) => rule.run(context));
}
```

Create `src/rules/tests.ts` with:

```ts
import type { Finding } from "../domain/types.js";
import { isSourcePath, isTestPath } from "../project/classify.js";
import type { Rule } from "./engine.js";

export const testRiskRule: Rule = {
  id: "tests.risk",
  check: "tests",
  run(context) {
    const findings: Finding[] = [];
    const sourceChanges = context.changedFiles.filter((file) => isSourcePath(file.path));
    const testChanges = context.changedFiles.filter((file) => isTestPath(file.path));

    if (sourceChanges.length > 0 && testChanges.length === 0) {
      findings.push({
        id: "tests.missing-related-tests",
        severity: "warn",
        title: "Source changed without tests",
        message: "Source-like files changed, but this diff does not include test-like files.",
        files: sourceChanges.map((file) => file.path),
        suggestion: "Add or update tests that cover the changed behavior before shipping.",
      });
    }

    for (const file of context.changedFiles) {
      const added = file.patch.split(/\r?\n/).filter((line) => line.startsWith("+") && !line.startsWith("+++"));
      if (added.some((line) => /\.(only)\s*\(|\bfit\s*\(/.test(line))) {
        findings.push({
          id: "tests.focused-test",
          severity: "fail",
          title: "Focused test introduced",
          message: "The diff introduces a focused test, which can hide the rest of the suite.",
          files: [file.path],
          suggestion: "Remove `.only` or `fit` before merging.",
        });
      }

      if (added.some((line) => /\.(skip)\s*\(|\bxit\s*\(/.test(line))) {
        findings.push({
          id: "tests.skipped-test",
          severity: "warn",
          title: "Skipped test introduced",
          message: "The diff introduces a skipped test.",
          files: [file.path],
          suggestion: "Confirm the skipped test is intentional and tracked before shipping.",
        });
      }
    }

    return findings;
  },
};
```

Create `src/rules/index.ts` with:

```ts
import type { Rule } from "./engine.js";
import { testRiskRule } from "./tests.js";

export const defaultRules: Rule[] = [testRiskRule];
```

- [ ] **Step 4: Run test-risk tests**

Run:

```bash
npm test -- tests/rules/tests.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit rule engine and test-risk rule**

Run:

```bash
git add src/rules tests/rules/tests.test.ts
git commit -m "feat: add deterministic test risk checks"
```

Expected: commit succeeds.

---

### Task 4: Dependency, Env, CI/Deploy, and Security Rules

**Files:**
- Create: `src/rules/dependencies.ts`
- Create: `src/rules/env.ts`
- Create: `src/rules/ciDeploy.ts`
- Create: `src/rules/security.ts`
- Modify: `src/rules/index.ts`
- Test: `tests/rules/dependencies.test.ts`
- Test: `tests/rules/env.test.ts`
- Test: `tests/rules/ciDeploy.test.ts`
- Test: `tests/rules/security.test.ts`

- [ ] **Step 1: Write failing dependency rule tests**

Create `tests/rules/dependencies.test.ts` with:

```ts
import { describe, expect, it } from "vitest";
import type { GateContext } from "../../src/domain/types.js";
import { dependencyRiskRule } from "../../src/rules/dependencies.js";

const baseContext: GateContext = {
  repoRoot: "/repo",
  baseRef: "main",
  changedFiles: [],
  metadata: {
    hasPackageJson: true,
    hasPackageLock: true,
    hasPnpmLock: false,
    hasYarnLock: false,
    hasPyproject: false,
    hasRequirements: false,
    hasGoMod: false,
    hasCargoToml: false,
    hasPomXml: false,
    hasDockerfile: false,
    hasCompose: false,
    hasGitHubActions: false,
    hasEnvExample: false,
  },
};

describe("dependencyRiskRule", () => {
  it("warns when manifest changes without lockfile", () => {
    const findings = dependencyRiskRule.run({
      ...baseContext,
      changedFiles: [{ path: "package.json", status: "modified", patch: "+  \"left-pad\": \"1.3.0\"" }],
    });

    expect(findings).toContainEqual(expect.objectContaining({ id: "dependencies.lockfile-not-updated", severity: "warn" }));
  });

  it("does not warn when manifest and lockfile change together", () => {
    const findings = dependencyRiskRule.run({
      ...baseContext,
      changedFiles: [
        { path: "package.json", status: "modified", patch: "+  \"left-pad\": \"1.3.0\"" },
        { path: "package-lock.json", status: "modified", patch: "+left-pad" },
      ],
    });

    expect(findings.some((finding) => finding.id === "dependencies.lockfile-not-updated")).toBe(false);
  });

  it("fails risky package scripts", () => {
    const findings = dependencyRiskRule.run({
      ...baseContext,
      changedFiles: [{ path: "package.json", status: "modified", patch: "+    \"postinstall\": \"curl https://example.com/install.sh | bash\"" }],
    });

    expect(findings).toContainEqual(expect.objectContaining({ id: "dependencies.risky-install-script", severity: "fail" }));
  });
});
```

- [ ] **Step 2: Write failing env, CI/deploy, and security tests**

Create `tests/rules/env.test.ts` with:

```ts
import { describe, expect, it } from "vitest";
import type { GateContext } from "../../src/domain/types.js";
import { envRiskRule } from "../../src/rules/env.js";

const context = (changedFiles: GateContext["changedFiles"]): GateContext => ({
  repoRoot: "/repo",
  baseRef: "main",
  changedFiles,
  metadata: {
    hasPackageJson: false,
    hasPackageLock: false,
    hasPnpmLock: false,
    hasYarnLock: false,
    hasPyproject: false,
    hasRequirements: false,
    hasGoMod: false,
    hasCargoToml: false,
    hasPomXml: false,
    hasDockerfile: false,
    hasCompose: false,
    hasGitHubActions: false,
    hasEnvExample: false,
  },
});

describe("envRiskRule", () => {
  it("warns when env usage is added without an env example update", () => {
    const findings = envRiskRule.run(context([{ path: "src/config.ts", status: "modified", patch: "+const key = process.env.OPENAI_API_KEY;" }]));
    expect(findings).toContainEqual(expect.objectContaining({ id: "env.example-not-updated", severity: "warn" }));
  });

  it("fails committed env files and secret-like values", () => {
    const findings = envRiskRule.run(
      context([
        { path: ".env", status: "added", patch: "+TOKEN=abc" },
        { path: "src/config.ts", status: "modified", patch: "+const token = \"sk-1234567890abcdef1234567890abcdef\";" },
      ]),
    );

    expect(findings).toContainEqual(expect.objectContaining({ id: "env.secret-file-committed", severity: "fail" }));
    expect(findings).toContainEqual(expect.objectContaining({ id: "env.secret-like-value", severity: "fail" }));
  });
});
```

Create `tests/rules/ciDeploy.test.ts` with:

```ts
import { describe, expect, it } from "vitest";
import type { GateContext } from "../../src/domain/types.js";
import { ciRiskRule, dockerRiskRule } from "../../src/rules/ciDeploy.js";

const context = (changedFiles: GateContext["changedFiles"]): GateContext => ({
  repoRoot: "/repo",
  baseRef: "main",
  changedFiles,
  metadata: {
    hasPackageJson: true,
    hasPackageLock: true,
    hasPnpmLock: false,
    hasYarnLock: false,
    hasPyproject: false,
    hasRequirements: false,
    hasGoMod: false,
    hasCargoToml: false,
    hasPomXml: false,
    hasDockerfile: true,
    hasCompose: false,
    hasGitHubActions: true,
    hasEnvExample: false,
  },
});

describe("ci and docker risk rules", () => {
  it("warns when deployment files change", () => {
    const findings = ciRiskRule.run(context([{ path: ".github/workflows/deploy.yml", status: "modified", patch: "+run: npm run deploy" }]));
    expect(findings).toContainEqual(expect.objectContaining({ id: "deploy.config-changed", severity: "warn" }));
  });

  it("warns when Dockerfile lacks healthcheck", () => {
    const findings = dockerRiskRule.run(context([{ path: "Dockerfile", status: "modified", patch: "+FROM node:20\n+CMD npm start" }]));
    expect(findings).toContainEqual(expect.objectContaining({ id: "deploy.dockerfile-healthcheck-missing", severity: "warn" }));
  });
});
```

Create `tests/rules/security.test.ts` with:

```ts
import { describe, expect, it } from "vitest";
import type { GateContext } from "../../src/domain/types.js";
import { securityRiskRule } from "../../src/rules/security.js";

const context = (changedFiles: GateContext["changedFiles"]): GateContext => ({
  repoRoot: "/repo",
  baseRef: "main",
  changedFiles,
  metadata: {
    hasPackageJson: false,
    hasPackageLock: false,
    hasPnpmLock: false,
    hasYarnLock: false,
    hasPyproject: false,
    hasRequirements: false,
    hasGoMod: false,
    hasCargoToml: false,
    hasPomXml: false,
    hasDockerfile: false,
    hasCompose: false,
    hasGitHubActions: false,
    hasEnvExample: false,
  },
});

describe("securityRiskRule", () => {
  it("warns on security-sensitive changed areas", () => {
    const findings = securityRiskRule.run(context([{ path: "src/auth/session.ts", status: "modified", patch: "+export function login() {}" }]));
    expect(findings).toContainEqual(expect.objectContaining({ id: "security.sensitive-area-changed", severity: "warn" }));
  });

  it("fails obvious secrets in patches", () => {
    const findings = securityRiskRule.run(context([{ path: "src/config.ts", status: "modified", patch: "+token = \"sk-1234567890abcdef1234567890abcdef\"" }]));
    expect(findings).toContainEqual(expect.objectContaining({ id: "security.secret-in-diff", severity: "fail" }));
  });
});
```

- [ ] **Step 3: Run rule tests and verify they fail**

Run:

```bash
npm test -- tests/rules/dependencies.test.ts tests/rules/env.test.ts tests/rules/ciDeploy.test.ts tests/rules/security.test.ts
```

Expected: FAIL because rule implementation files do not exist.

- [ ] **Step 4: Implement dependency rule**

Create `src/rules/dependencies.ts` with:

```ts
import type { Finding } from "../domain/types.js";
import { isDependencyManifest, isLockfile } from "../project/classify.js";
import type { Rule } from "./engine.js";

export const dependencyRiskRule: Rule = {
  id: "dependencies.risk",
  check: "dependencies",
  run(context) {
    const findings: Finding[] = [];
    const manifests = context.changedFiles.filter((file) => isDependencyManifest(file.path));
    const lockfiles = context.changedFiles.filter((file) => isLockfile(file.path));

    if (manifests.length > 0 && lockfiles.length === 0) {
      findings.push({
        id: "dependencies.lockfile-not-updated",
        severity: "warn",
        title: "Dependency manifest changed without lockfile",
        message: "A dependency manifest changed, but no recognized lockfile changed in the same diff.",
        files: manifests.map((file) => file.path),
        suggestion: "Update and commit the matching lockfile so CI and installs stay reproducible.",
      });
    }

    for (const file of manifests) {
      const added = file.patch.split(/\r?\n/).filter((line) => line.startsWith("+") && !line.startsWith("+++"));
      if (added.some((line) => /"postinstall"\s*:|curl\s+https?:\/\/|wget\s+https?:\/\//.test(line))) {
        findings.push({
          id: "dependencies.risky-install-script",
          severity: "fail",
          title: "Risky install-time behavior introduced",
          message: "The dependency manifest appears to introduce install-time scripts or remote downloads.",
          files: [file.path],
          suggestion: "Remove the install-time behavior or document and review why it is required.",
        });
      }
    }

    return findings;
  },
};
```

- [ ] **Step 5: Implement environment rule**

Create `src/rules/env.ts` with:

```ts
import type { Finding } from "../domain/types.js";
import { isEnvExamplePath, patchAddsEnvUsage, patchContainsSecret } from "../project/classify.js";
import type { Rule } from "./engine.js";

export const envRiskRule: Rule = {
  id: "env.risk",
  check: "env",
  run(context) {
    const findings: Finding[] = [];
    const envUsageFiles = context.changedFiles.filter((file) => patchAddsEnvUsage(file.patch));
    const envExampleChanged = context.changedFiles.some((file) => isEnvExamplePath(file.path) || /README|docs\//i.test(file.path));

    if (envUsageFiles.length > 0 && !envExampleChanged && !context.metadata.hasEnvExample) {
      findings.push({
        id: "env.example-not-updated",
        severity: "warn",
        title: "New environment variable usage lacks an example",
        message: "The diff adds environment variable usage without updating an env example or documentation.",
        files: envUsageFiles.map((file) => file.path),
        suggestion: "Add the required variable to `.env.example` or document it in setup instructions.",
      });
    }

    const secretFiles = context.changedFiles.filter((file) => /^\.env($|\.)/.test(file.path) && !isEnvExamplePath(file.path));
    if (secretFiles.length > 0) {
      findings.push({
        id: "env.secret-file-committed",
        severity: "fail",
        title: "Secret-like env file committed",
        message: "A real env file appears in the diff.",
        files: secretFiles.map((file) => file.path),
        suggestion: "Remove the env file from git and commit a safe example file instead.",
      });
    }

    const secretValueFiles = context.changedFiles.filter((file) => patchContainsSecret(file.patch));
    if (secretValueFiles.length > 0) {
      findings.push({
        id: "env.secret-like-value",
        severity: "fail",
        title: "Secret-like value in diff",
        message: "The diff includes a token, key, password, or secret-like value.",
        files: secretValueFiles.map((file) => file.path),
        suggestion: "Rotate the secret if it is real, then replace it with a safe example value.",
      });
    }

    return findings;
  },
};
```

- [ ] **Step 6: Implement CI/deploy rule**

Create `src/rules/ciDeploy.ts` with:

```ts
import type { Finding } from "../domain/types.js";
import { isCiOrDeployPath } from "../project/classify.js";
import type { Rule } from "./engine.js";

export const ciRiskRule: Rule = {
  id: "ci.risk",
  check: "ci",
  run(context) {
    const findings: Finding[] = [];
    const deployFiles = context.changedFiles.filter((file) => isCiOrDeployPath(file.path) && !isDockerPath(file.path));

    if (deployFiles.length > 0) {
      findings.push({
        id: "deploy.config-changed",
        severity: "warn",
        title: "CI or deployment configuration changed",
        message: "The diff changes CI, compose, or deployment files.",
        files: deployFiles.map((file) => file.path),
        suggestion: "Verify the changed deployment path in CI or include validation notes in the PR.",
      });
    }

    return findings;
  },
};

export const dockerRiskRule: Rule = {
  id: "docker.risk",
  check: "docker",
  run(context) {
    const findings: Finding[] = [];
    const dockerfiles = context.changedFiles.filter((file) => isDockerPath(file.path));

    for (const file of dockerfiles) {
      const patch = file.patch.toUpperCase();
      if (!patch.includes("HEALTHCHECK")) {
        findings.push({
          id: "deploy.dockerfile-healthcheck-missing",
          severity: "warn",
          title: "Dockerfile healthcheck not present",
          message: "A Dockerfile changed without adding or retaining an obvious HEALTHCHECK instruction in the patch.",
          files: [file.path],
          suggestion: "Confirm the image has an external healthcheck or add a Docker HEALTHCHECK.",
        });
      }
    }

    return findings;
  },
};

function isDockerPath(path: string): boolean {
  return path === "Dockerfile" || path.endsWith("/Dockerfile");
}
```

- [ ] **Step 7: Implement security rule and default registry**

Create `src/rules/security.ts` with:

```ts
import type { Finding } from "../domain/types.js";
import { patchContainsSecret, touchesSecuritySensitiveArea } from "../project/classify.js";
import type { Rule } from "./engine.js";

export const securityRiskRule: Rule = {
  id: "security.risk",
  check: "security",
  run(context) {
    const findings: Finding[] = [];
    const sensitiveFiles = context.changedFiles.filter((file) => touchesSecuritySensitiveArea(file.path, file.patch));
    const secretFiles = context.changedFiles.filter((file) => patchContainsSecret(file.patch));

    if (sensitiveFiles.length > 0) {
      findings.push({
        id: "security.sensitive-area-changed",
        severity: "warn",
        title: "Security-sensitive area changed",
        message: "The diff touches authentication, authorization, payments, cryptography, CORS, SQL/query handling, uploads, tokens, or sessions.",
        files: sensitiveFiles.map((file) => file.path),
        suggestion: "Review this change with extra care and make sure tests cover the security-sensitive behavior.",
      });
    }

    if (secretFiles.length > 0) {
      findings.push({
        id: "security.secret-in-diff",
        severity: "fail",
        title: "Secret-like value in diff",
        message: "The diff contains a token, key, password, or secret-like value.",
        files: secretFiles.map((file) => file.path),
        suggestion: "Remove the value from git history if needed, rotate it, and use a safe example value.",
      });
    }

    return findings;
  },
};
```

Replace `src/rules/index.ts` with:

```ts
import type { Rule } from "./engine.js";
import { ciRiskRule, dockerRiskRule } from "./ciDeploy.js";
import { dependencyRiskRule } from "./dependencies.js";
import { envRiskRule } from "./env.js";
import { securityRiskRule } from "./security.js";
import { testRiskRule } from "./tests.js";

export const defaultRules: Rule[] = [
  testRiskRule,
  dependencyRiskRule,
  envRiskRule,
  ciRiskRule,
  dockerRiskRule,
  securityRiskRule,
];
```

- [ ] **Step 8: Run all rule tests**

Run:

```bash
npm test -- tests/rules
```

Expected: PASS.

- [ ] **Step 9: Commit remaining rules**

Run:

```bash
git add src/rules tests/rules
git commit -m "feat: add release risk rules"
```

Expected: commit succeeds.

---

### Task 5: Config Loading

**Files:**
- Create: `src/config/defaults.ts`
- Create: `src/config/loadConfig.ts`
- Create: `shipgate.config.example.yaml`
- Test: `tests/config/loadConfig.test.ts`

- [ ] **Step 1: Write failing config tests**

Create `tests/config/loadConfig.test.ts` with:

```ts
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { defaultConfig } from "../../src/config/defaults.js";
import { loadConfig } from "../../src/config/loadConfig.js";

let dir: string;

beforeEach(async () => {
  dir = join(tmpdir(), `shipgate-config-${Date.now()}-${Math.random()}`);
  await mkdir(dir, { recursive: true });
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("loadConfig", () => {
  it("returns defaults when no config exists", async () => {
    await expect(loadConfig(dir)).resolves.toEqual(defaultConfig);
  });

  it("merges user config over defaults", async () => {
    await writeFile(
      join(dir, "shipgate.config.yaml"),
      "failOn: warn\nai:\n  enabled: true\nchecks:\n  docker: false\n",
    );

    await expect(loadConfig(dir)).resolves.toEqual({
      ...defaultConfig,
      failOn: "warn",
      ai: { enabled: true },
      checks: {
        ...defaultConfig.checks,
        docker: false,
      },
    });
  });

  it("rejects invalid failOn values", async () => {
    await writeFile(join(dir, "shipgate.config.yaml"), "failOn: sometimes\n");
    await expect(loadConfig(dir)).rejects.toThrow("Invalid failOn");
  });
});
```

- [ ] **Step 2: Run config tests and verify they fail**

Run:

```bash
npm test -- tests/config/loadConfig.test.ts
```

Expected: FAIL because config files do not exist.

- [ ] **Step 3: Implement default config and loader**

Create `src/config/defaults.ts` with:

```ts
import type { ShipGateConfig } from "../domain/types.js";

export const defaultConfig: ShipGateConfig = {
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

Create `src/config/loadConfig.ts` with:

```ts
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import YAML from "yaml";
import type { ShipGateConfig } from "../domain/types.js";
import { defaultConfig } from "./defaults.js";

export async function loadConfig(cwd: string): Promise<ShipGateConfig> {
  const path = join(cwd, "shipgate.config.yaml");
  let raw: string;

  try {
    raw = await readFile(path, "utf8");
  } catch (error) {
    if (isMissingFileError(error)) {
      return structuredClone(defaultConfig);
    }
    throw error;
  }

  const parsed = YAML.parse(raw) as Partial<ShipGateConfig> | null;
  return mergeConfig(parsed ?? {});
}

export function mergeConfig(config: Partial<ShipGateConfig>): ShipGateConfig {
  if (config.failOn !== undefined && config.failOn !== "warn" && config.failOn !== "fail") {
    throw new Error("Invalid failOn value. Expected 'warn' or 'fail'.");
  }

  return {
    failOn: config.failOn ?? defaultConfig.failOn,
    ai: {
      enabled: config.ai?.enabled ?? defaultConfig.ai.enabled,
    },
    checks: {
      tests: config.checks?.tests ?? defaultConfig.checks.tests,
      dependencies: config.checks?.dependencies ?? defaultConfig.checks.dependencies,
      ci: config.checks?.ci ?? defaultConfig.checks.ci,
      docker: config.checks?.docker ?? defaultConfig.checks.docker,
      env: config.checks?.env ?? defaultConfig.checks.env,
      security: config.checks?.security ?? defaultConfig.checks.security,
    },
  };
}

function isMissingFileError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}
```

Create `shipgate.config.example.yaml` with:

```yaml
failOn: fail
ai:
  enabled: false
checks:
  tests: true
  dependencies: true
  ci: true
  docker: true
  env: true
  security: true
```

- [ ] **Step 4: Run config tests**

Run:

```bash
npm test -- tests/config/loadConfig.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit config loading**

Run:

```bash
git add src/config tests/config shipgate.config.example.yaml
git commit -m "feat: add Ship Gate configuration"
```

Expected: commit succeeds.

---

### Task 6: Git Context Collection

**Files:**
- Create: `src/git/git.ts`
- Modify: `src/domain/types.ts`
- Test: `tests/git/git.test.ts`

- [ ] **Step 1: Write failing git collection tests with mocked exec**

Create `tests/git/git.test.ts` with:

```ts
import { describe, expect, it, vi } from "vitest";
import { collectGitContext, parseChangedFiles, parseNameStatus } from "../../src/git/git.js";

describe("parseNameStatus", () => {
  it("parses modified, added, deleted, and renamed files", () => {
    expect(parseNameStatus("M\tsrc/app.ts\nA\t.env\nD\told.ts\nR100\told-name.ts\tnew-name.ts\n")).toEqual([
      { path: "src/app.ts", status: "modified" },
      { path: ".env", status: "added" },
      { path: "old.ts", status: "deleted" },
      { path: "new-name.ts", status: "renamed" },
    ]);
  });
});

describe("parseChangedFiles", () => {
  it("attaches patches to changed file entries", () => {
    const files = parseChangedFiles(
      "M\tsrc/app.ts\n",
      "diff --git a/src/app.ts b/src/app.ts\n+++ b/src/app.ts\n+const ok = true;\n",
    );

    expect(files).toEqual([
      {
        path: "src/app.ts",
        status: "modified",
        patch: "diff --git a/src/app.ts b/src/app.ts\n+++ b/src/app.ts\n+const ok = true;\n",
      },
    ]);
  });
});

describe("collectGitContext", () => {
  it("collects repo root, base ref, changed files, and metadata", async () => {
    const exec = vi
      .fn()
      .mockResolvedValueOnce("/repo\n")
      .mockResolvedValueOnce("main\n")
      .mockResolvedValueOnce("M\tsrc/app.ts\n")
      .mockResolvedValueOnce("diff --git a/src/app.ts b/src/app.ts\n+++ b/src/app.ts\n+const ok = true;\n")
      .mockResolvedValueOnce("package.json\npackage-lock.json\nDockerfile\n.github/workflows/ci.yml\n.env.example\n");

    const context = await collectGitContext({ cwd: "/repo", base: undefined, exec });

    expect(context.repoRoot).toBe("/repo");
    expect(context.baseRef).toBe("main");
    expect(context.changedFiles[0]?.path).toBe("src/app.ts");
    expect(context.metadata.hasPackageJson).toBe(true);
    expect(context.metadata.hasDockerfile).toBe(true);
    expect(context.metadata.hasGitHubActions).toBe(true);
    expect(context.metadata.hasEnvExample).toBe(true);
  });
});
```

- [ ] **Step 2: Run git tests and verify they fail**

Run:

```bash
npm test -- tests/git/git.test.ts
```

Expected: FAIL because `src/git/git.ts` does not exist.

- [ ] **Step 3: Implement git context collection**

Create `src/git/git.ts` with:

```ts
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { ChangedFile, GateContext, ProjectMetadata } from "../domain/types.js";

type Exec = (args: string[], cwd: string) => Promise<string>;

const execFileAsync = promisify(execFile);

export async function collectGitContext(options: {
  cwd: string;
  base?: string;
  exec?: Exec;
}): Promise<GateContext> {
  const exec = options.exec ?? git;
  const repoRoot = (await exec(["rev-parse", "--show-toplevel"], options.cwd)).trim();
  const baseRef = options.base ?? (await resolveDefaultBase(exec, repoRoot));
  const nameStatus = await exec(["diff", "--name-status", baseRef, "--"], repoRoot);
  const patch = await exec(["diff", "--unified=0", baseRef, "--"], repoRoot);
  const trackedFiles = await exec(["ls-files"], repoRoot);

  return {
    repoRoot,
    baseRef,
    changedFiles: parseChangedFiles(nameStatus, patch),
    metadata: detectMetadata(trackedFiles),
  };
}

export function parseChangedFiles(nameStatus: string, patch: string): ChangedFile[] {
  return parseNameStatus(nameStatus).map((file) => ({
    ...file,
    patch: extractPatchForPath(patch, file.path),
  }));
}

export function parseNameStatus(nameStatus: string): Array<Omit<ChangedFile, "patch">> {
  return nameStatus
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [statusCode, firstPath, secondPath] = line.split("\t");
      const path = statusCode.startsWith("R") ? secondPath : firstPath;
      return {
        path,
        status: statusFromCode(statusCode),
      };
    });
}

function statusFromCode(code: string): ChangedFile["status"] {
  if (code === "A") return "added";
  if (code === "M") return "modified";
  if (code === "D") return "deleted";
  if (code.startsWith("R")) return "renamed";
  return "unknown";
}

function extractPatchForPath(patch: string, path: string): string {
  const sections = patch.split(/^diff --git /m).filter(Boolean).map((section) => `diff --git ${section}`);
  return sections.find((section) => section.includes(` b/${path}`) || section.includes(`"${path}"`)) ?? "";
}

function detectMetadata(lsFilesOutput: string): ProjectMetadata {
  const files = new Set(lsFilesOutput.split(/\r?\n/).filter(Boolean));
  const hasAny = (...paths: string[]) => paths.some((path) => files.has(path));
  const hasPrefix = (prefix: string) => [...files].some((file) => file.startsWith(prefix));

  return {
    hasPackageJson: files.has("package.json"),
    hasPackageLock: files.has("package-lock.json"),
    hasPnpmLock: files.has("pnpm-lock.yaml"),
    hasYarnLock: files.has("yarn.lock"),
    hasPyproject: files.has("pyproject.toml"),
    hasRequirements: files.has("requirements.txt"),
    hasGoMod: files.has("go.mod"),
    hasCargoToml: files.has("Cargo.toml"),
    hasPomXml: files.has("pom.xml"),
    hasDockerfile: files.has("Dockerfile") || [...files].some((file) => file.endsWith("/Dockerfile")),
    hasCompose: hasAny("docker-compose.yml", "docker-compose.yaml"),
    hasGitHubActions: hasPrefix(".github/workflows/"),
    hasEnvExample: hasAny(".env.example", ".env.sample", "env.example"),
  };
}

async function resolveDefaultBase(exec: Exec, cwd: string): Promise<string> {
  try {
    return (await exec(["merge-base", "HEAD", "main"], cwd)).trim();
  } catch {
    try {
      return (await exec(["merge-base", "HEAD", "master"], cwd)).trim();
    } catch {
      return "HEAD";
    }
  }
}

async function git(args: string[], cwd: string): Promise<string> {
  const { stdout } = await execFileAsync("git", args, { cwd });
  return String(stdout);
}
```

- [ ] **Step 4: Run git tests**

Run:

```bash
npm test -- tests/git/git.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit git collection**

Run:

```bash
git add src/git tests/git
git commit -m "feat: collect git diff context"
```

Expected: commit succeeds.

---

### Task 7: Reporters

**Files:**
- Create: `src/reporters/json.ts`
- Create: `src/reporters/markdown.ts`
- Create: `src/reporters/terminal.ts`
- Create: `src/reporters/index.ts`
- Test: `tests/reporters/reporters.test.ts`

- [ ] **Step 1: Write failing reporter tests**

Create `tests/reporters/reporters.test.ts` with:

```ts
import { describe, expect, it } from "vitest";
import type { GateReport } from "../../src/domain/types.js";
import { renderJson } from "../../src/reporters/json.js";
import { renderMarkdown } from "../../src/reporters/markdown.js";
import { renderTerminal } from "../../src/reporters/terminal.js";

const report: GateReport = {
  verdict: "warn",
  findings: [
    {
      id: "tests.missing-related-tests",
      severity: "warn",
      title: "Source changed without tests",
      message: "Source changed but tests did not.",
      files: ["src/app.ts"],
      suggestion: "Add tests.",
    },
  ],
  aiSummary: "This change needs test coverage before shipping.",
};

describe("reporters", () => {
  it("renders JSON", () => {
    expect(JSON.parse(renderJson(report))).toEqual(report);
  });

  it("renders Markdown", () => {
    const markdown = renderMarkdown(report);
    expect(markdown).toContain("# AI Ship Gate: WARN");
    expect(markdown).toContain("tests.missing-related-tests");
    expect(markdown).toContain("This change needs test coverage");
  });

  it("renders terminal text", () => {
    const terminal = renderTerminal(report, { color: false });
    expect(terminal).toContain("AI Ship Gate: WARN");
    expect(terminal).toContain("Source changed without tests");
  });
});
```

- [ ] **Step 2: Run reporter tests and verify they fail**

Run:

```bash
npm test -- tests/reporters/reporters.test.ts
```

Expected: FAIL because reporter files do not exist.

- [ ] **Step 3: Implement reporters**

Create `src/reporters/json.ts` with:

```ts
import type { GateReport } from "../domain/types.js";

export function renderJson(report: GateReport): string {
  return `${JSON.stringify(report, null, 2)}\n`;
}
```

Create `src/reporters/markdown.ts` with:

```ts
import type { Finding, GateReport } from "../domain/types.js";

export function renderMarkdown(report: GateReport): string {
  const lines = [`# AI Ship Gate: ${report.verdict.toUpperCase()}`, ""];

  if (report.aiSummary) {
    lines.push("## AI Summary", "", report.aiSummary, "");
  }

  if (report.findings.length === 0) {
    lines.push("No release risks detected.", "");
    return lines.join("\n");
  }

  lines.push("## Findings", "");
  for (const finding of report.findings) {
    lines.push(formatFinding(finding), "");
  }

  return lines.join("\n");
}

function formatFinding(finding: Finding): string {
  return [
    `### ${finding.severity.toUpperCase()}: ${finding.title}`,
    "",
    `- Rule: \`${finding.id}\``,
    `- Files: ${finding.files.map((file) => `\`${file}\``).join(", ")}`,
    `- Reason: ${finding.message}`,
    `- Suggestion: ${finding.suggestion}`,
  ].join("\n");
}
```

Create `src/reporters/terminal.ts` with:

```ts
import pc from "picocolors";
import type { Finding, GateReport, Verdict } from "../domain/types.js";

export function renderTerminal(report: GateReport, options: { color?: boolean } = {}): string {
  const color = options.color ?? true;
  const paint = color ? colorFor(report.verdict) : (value: string) => value;
  const lines = [paint(`AI Ship Gate: ${report.verdict.toUpperCase()}`), ""];

  if (report.aiSummary) {
    lines.push("AI Summary", report.aiSummary, "");
  }

  if (report.findings.length === 0) {
    lines.push("No release risks detected.", "");
    return lines.join("\n");
  }

  for (const finding of report.findings) {
    lines.push(formatFinding(finding), "");
  }

  return lines.join("\n");
}

function formatFinding(finding: Finding): string {
  return [
    `[${finding.severity.toUpperCase()}] ${finding.title}`,
    `Rule: ${finding.id}`,
    `Files: ${finding.files.join(", ")}`,
    `Reason: ${finding.message}`,
    `Suggestion: ${finding.suggestion}`,
  ].join("\n");
}

function colorFor(verdict: Verdict): (value: string) => string {
  if (verdict === "fail") return pc.red;
  if (verdict === "warn") return pc.yellow;
  return pc.green;
}
```

Create `src/reporters/index.ts` with:

```ts
import type { GateReport, OutputFormat } from "../domain/types.js";
import { renderJson } from "./json.js";
import { renderMarkdown } from "./markdown.js";
import { renderTerminal } from "./terminal.js";

export function renderReport(report: GateReport, format: OutputFormat): string {
  if (format === "json") return renderJson(report);
  if (format === "markdown") return renderMarkdown(report);
  return renderTerminal(report);
}
```

- [ ] **Step 4: Run reporter tests**

Run:

```bash
npm test -- tests/reporters/reporters.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit reporters**

Run:

```bash
git add src/reporters tests/reporters
git commit -m "feat: add Ship Gate reporters"
```

Expected: commit succeeds.

---

### Task 8: Runner and CLI Commands

**Files:**
- Modify: `src/run.ts`
- Modify: `src/cli.ts`
- Test: `tests/cli/run.test.ts`

- [ ] **Step 1: Write failing runner tests**

Create `tests/cli/run.test.ts` with:

```ts
import { describe, expect, it, vi } from "vitest";
import type { GateContext } from "../../src/domain/types.js";
import { runCheck } from "../../src/run.js";

const context: GateContext = {
  repoRoot: "/repo",
  baseRef: "main",
  changedFiles: [{ path: "src/app.ts", status: "modified", patch: "+export const ok = true;" }],
  metadata: {
    hasPackageJson: true,
    hasPackageLock: true,
    hasPnpmLock: false,
    hasYarnLock: false,
    hasPyproject: false,
    hasRequirements: false,
    hasGoMod: false,
    hasCargoToml: false,
    hasPomXml: false,
    hasDockerfile: false,
    hasCompose: false,
    hasGitHubActions: false,
    hasEnvExample: false,
  },
};

describe("runCheck", () => {
  it("collects context, runs rules, renders output, and returns report", async () => {
    const collectContext = vi.fn().mockResolvedValue(context);
    const write = vi.fn();

    const result = await runCheck({
      cwd: "/repo",
      base: "main",
      format: "markdown",
      ai: false,
      collectContext,
      write,
    });

    expect(result.report.verdict).toBe("warn");
    expect(result.exitCode).toBe(0);
    expect(write).toHaveBeenCalledWith(expect.stringContaining("# AI Ship Gate: WARN"));
  });

  it("returns exit code 1 when failOn threshold is reached", async () => {
    const collectContext = vi.fn().mockResolvedValue({
      ...context,
      changedFiles: [{ path: ".env", status: "added", patch: "+TOKEN=abc" }],
    });

    const result = await runCheck({
      cwd: "/repo",
      format: "json",
      ai: false,
      collectContext,
      write: vi.fn(),
    });

    expect(result.report.verdict).toBe("fail");
    expect(result.exitCode).toBe(1);
  });
});
```

- [ ] **Step 2: Run runner tests and verify they fail**

Run:

```bash
npm test -- tests/cli/run.test.ts
```

Expected: FAIL because current `runCheck` does not accept injectable dependencies or execute rules.

- [ ] **Step 3: Extend types for runner dependency injection**

Modify `src/domain/types.ts` by replacing `CheckOptions` and adding `CheckResult`:

```ts
export interface CheckOptions {
  cwd: string;
  base?: string;
  format: OutputFormat;
  ai: boolean;
  collectContext?: (options: { cwd: string; base?: string }) => Promise<GateContext>;
  write?: (output: string) => void;
}

export interface CheckResult {
  report: GateReport;
  rendered: string;
  exitCode: number;
}
```

- [ ] **Step 4: Implement runner orchestration**

Replace `src/run.ts` with:

```ts
import { loadConfig } from "./config/loadConfig.js";
import { aggregateVerdict, shouldExitWithFailure } from "./domain/verdict.js";
import { collectGitContext } from "./git/git.js";
import type { CheckOptions, CheckResult, GateReport, ShipGateConfig } from "./domain/types.js";
import { maybeExplainWithAi } from "./ai/explain.js";
import { renderReport } from "./reporters/index.js";
import { defaultRules } from "./rules/index.js";
import { runRules } from "./rules/engine.js";

export async function runCheck(options: CheckOptions): Promise<CheckResult> {
  const config = await loadConfig(options.cwd);
  const collectContext = options.collectContext ?? collectGitContext;
  const context = await collectContext({ cwd: options.cwd, base: options.base });
  const enabledRules = defaultRules.filter((rule) => isRuleEnabled(rule.check, config.checks));
  const findings = runRules(context, enabledRules);
  const verdict = aggregateVerdict(findings);
  const aiSummary = await maybeExplainWithAi({
    enabled: options.ai || config.ai.enabled,
    report: { verdict, findings },
  });
  const report: GateReport = {
    verdict,
    findings,
    ...(aiSummary ? { aiSummary } : {}),
  };
  const rendered = renderReport(report, options.format);
  const write = options.write ?? ((output: string) => process.stdout.write(output));

  write(rendered);

  return {
    report,
    rendered,
    exitCode: shouldExitWithFailure(verdict, config.failOn) ? 1 : 0,
  };
}

function isRuleEnabled(ruleCheck: keyof ShipGateConfig["checks"], checks: ShipGateConfig["checks"]): boolean {
  return checks[ruleCheck];
}
```

If TypeScript reports that `maybeExplainWithAi` does not exist, create the temporary implementation in `src/ai/explain.ts`:

```ts
import type { GateReport } from "../domain/types.js";

export async function maybeExplainWithAi(_options: {
  enabled: boolean;
  report: Pick<GateReport, "verdict" | "findings">;
}): Promise<string | undefined> {
  return undefined;
}
```

- [ ] **Step 5: Update CLI to print output and exit with runner status**

Replace `src/cli.ts` with:

```ts
#!/usr/bin/env node
import { writeFile } from "node:fs/promises";
import { Command } from "commander";
import { defaultConfig } from "./config/defaults.js";
import { runCheck } from "./run.js";

const program = new Command();

program
  .name("shipgate")
  .description("A deterministic release gate for AI-generated code.")
  .version("0.1.0");

program
  .command("check")
  .description("Check the current git diff for release risk.")
  .option("--base <ref>", "Base ref to compare against")
  .option("--format <format>", "Output format: terminal, json, markdown", "terminal")
  .option("--ai", "Enable optional AI explanation", false)
  .action(async (options: { base?: string; format: "terminal" | "json" | "markdown"; ai: boolean }) => {
    const result = await runCheck({
      cwd: process.cwd(),
      base: options.base,
      format: options.format,
      ai: options.ai,
    });
    process.exitCode = result.exitCode;
  });

program
  .command("init")
  .description("Create a shipgate.config.yaml file.")
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
    await writeFile("shipgate.config.yaml", yaml, { flag: "wx" });
    console.log("Created shipgate.config.yaml");
  });

program.parseAsync(process.argv).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
```

- [ ] **Step 6: Run runner tests and typecheck**

Run:

```bash
npm test -- tests/cli/run.test.ts
npm run typecheck
```

Expected: PASS.

- [ ] **Step 7: Commit runner and CLI**

Run:

```bash
git add src/run.ts src/cli.ts src/domain/types.ts src/ai tests/cli
git commit -m "feat: wire release gate runner and CLI"
```

Expected: commit succeeds.

---

### Task 9: Optional AI Explanation

**Files:**
- Modify: `src/ai/explain.ts`
- Test: `tests/ai/explain.test.ts`

- [ ] **Step 1: Write failing AI explanation tests**

Create `tests/ai/explain.test.ts` with:

```ts
import { describe, expect, it, vi } from "vitest";
import { maybeExplainWithAi } from "../../src/ai/explain.js";

const report = {
  verdict: "warn" as const,
  findings: [
    {
      id: "tests.missing-related-tests",
      severity: "warn" as const,
      title: "Source changed without tests",
      message: "Source changed but tests did not.",
      files: ["src/app.ts"],
      suggestion: "Add tests.",
    },
  ],
};

describe("maybeExplainWithAi", () => {
  it("returns undefined when AI is disabled", async () => {
    await expect(maybeExplainWithAi({ enabled: false, report })).resolves.toBeUndefined();
  });

  it("returns undefined when API key is missing", async () => {
    await expect(maybeExplainWithAi({ enabled: true, report, env: {} })).resolves.toBeUndefined();
  });

  it("uses an OpenAI-compatible chat completions API", async () => {
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "Tests should be added before shipping." } }],
      }),
    });

    const summary = await maybeExplainWithAi({
      enabled: true,
      report,
      env: {
        OPENAI_API_KEY: "test-key",
        OPENAI_BASE_URL: "https://api.example.com/v1",
        OPENAI_MODEL: "test-model",
      },
      fetch,
    });

    expect(summary).toBe("Tests should be added before shipping.");
    expect(fetch).toHaveBeenCalledWith(
      "https://api.example.com/v1/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test-key",
        }),
      }),
    );
  });

  it("degrades gracefully on provider errors", async () => {
    const fetch = vi.fn().mockRejectedValue(new Error("network down"));
    await expect(
      maybeExplainWithAi({
        enabled: true,
        report,
        env: { OPENAI_API_KEY: "test-key" },
        fetch,
      }),
    ).resolves.toBeUndefined();
  });
});
```

- [ ] **Step 2: Run AI tests and verify they fail**

Run:

```bash
npm test -- tests/ai/explain.test.ts
```

Expected: FAIL because current `maybeExplainWithAi` does not call the provider.

- [ ] **Step 3: Implement optional OpenAI-compatible AI summary**

Replace `src/ai/explain.ts` with:

```ts
import type { GateReport } from "../domain/types.js";

interface ExplainOptions {
  enabled: boolean;
  report: Pick<GateReport, "verdict" | "findings">;
  env?: Record<string, string | undefined>;
  fetch?: typeof fetch;
}

export async function maybeExplainWithAi(options: ExplainOptions): Promise<string | undefined> {
  if (!options.enabled) return undefined;

  const env = options.env ?? process.env;
  const apiKey = env.OPENAI_API_KEY;
  if (!apiKey) return undefined;

  const baseUrl = (env.OPENAI_BASE_URL ?? "https://api.openai.com/v1").replace(/\/$/, "");
  const model = env.OPENAI_MODEL ?? "gpt-4.1-mini";
  const fetchImpl = options.fetch ?? fetch;

  try {
    const response = await fetchImpl(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content:
              "You summarize deterministic release gate findings. Do not change the verdict. Keep the answer under 120 words.",
          },
          {
            role: "user",
            content: JSON.stringify(options.report),
          },
        ],
        temperature: 0.2,
      }),
    });

    if (!response.ok) return undefined;

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    return data.choices?.[0]?.message?.content?.trim() || undefined;
  } catch {
    return undefined;
  }
}
```

- [ ] **Step 4: Run AI tests**

Run:

```bash
npm test -- tests/ai/explain.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit AI mode**

Run:

```bash
git add src/ai tests/ai
git commit -m "feat: add optional AI explanations"
```

Expected: commit succeeds.

---

### Task 10: GitHub Action Wrapper

**Files:**
- Create: `action.yml`
- Create: `src/action.ts`
- Test: `tests/action/action.test.ts`

- [ ] **Step 1: Write failing Action entrypoint test**

Create `tests/action/action.test.ts` with:

```ts
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runAction } from "../../src/action.js";

let dir: string;
let summaryPath: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "shipgate-action-"));
  summaryPath = join(dir, "summary.md");
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("runAction", () => {
  it("writes the rendered report to the GitHub step summary", async () => {
    const runCheck = vi.fn().mockResolvedValue({
      report: { verdict: "warn", findings: [] },
      rendered: "# AI Ship Gate: WARN\n",
      exitCode: 0,
    });

    const exitCode = await runAction({
      env: {
        GITHUB_WORKSPACE: dir,
        GITHUB_STEP_SUMMARY: summaryPath,
        INPUT_BASE: "main",
        INPUT_AI: "false",
      },
      runCheck,
    });

    await expect(readFile(summaryPath, "utf8")).resolves.toContain("# AI Ship Gate: WARN");
    expect(exitCode).toBe(0);
    expect(runCheck).toHaveBeenCalledWith(
      expect.objectContaining({
        cwd: dir,
        base: "main",
        format: "markdown",
        ai: false,
      }),
    );
  });
});
```

- [ ] **Step 2: Run Action test and verify it fails**

Run:

```bash
npm test -- tests/action/action.test.ts
```

Expected: FAIL because `src/action.ts` does not exist.

- [ ] **Step 3: Implement Action metadata and entrypoint**

Create `action.yml` with:

```yaml
name: AI Ship Gate
description: Deterministic release gate for AI-generated code.
inputs:
  base:
    description: Base ref to compare against.
    required: false
    default: main
  ai:
    description: Enable optional AI explanation.
    required: false
    default: "false"
runs:
  using: node20
  main: dist/action.js
```

Create `src/action.ts` with:

```ts
import { appendFile } from "node:fs/promises";
import { runCheck as defaultRunCheck } from "./run.js";

interface ActionOptions {
  env?: Record<string, string | undefined>;
  runCheck?: typeof defaultRunCheck;
}

export async function runAction(options: ActionOptions = {}): Promise<number> {
  const env = options.env ?? process.env;
  const runCheck = options.runCheck ?? defaultRunCheck;
  const cwd = env.GITHUB_WORKSPACE ?? process.cwd();
  const base = env.INPUT_BASE || undefined;
  const ai = env.INPUT_AI === "true";

  const result = await runCheck({
    cwd,
    base,
    format: "markdown",
    ai,
  });

  if (env.GITHUB_STEP_SUMMARY) {
    await appendFile(env.GITHUB_STEP_SUMMARY, result.rendered);
  }

  return result.exitCode;
}

if (process.env.GITHUB_ACTIONS) {
  runAction()
    .then((exitCode) => {
      process.exitCode = exitCode;
    })
    .catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      console.error(message);
      process.exitCode = 1;
    });
}
```

- [ ] **Step 4: Run Action tests and build**

Run:

```bash
npm test -- tests/action/action.test.ts
npm run build
```

Expected: PASS and `dist/action.js` exists.

- [ ] **Step 5: Commit GitHub Action wrapper**

Run:

```bash
git add action.yml src/action.ts tests/action dist
git commit -m "feat: add GitHub Action wrapper"
```

Expected: commit succeeds.

---

### Task 11: README and Demo Documentation

**Files:**
- Create: `README.md`
- Create: `examples/risky-diff.md`

- [ ] **Step 1: Write README**

Create `README.md` with:

```md
# AI Ship Gate

A deterministic release gate for AI-generated code.

AI coding tools can move fast, but fast code still needs a release gate. AI Ship Gate checks the current git diff for practical shipping risks: missing tests, dependency drift, unsafe env changes, CI and Docker changes, and security-sensitive edits.

The final verdict is deterministic. Optional AI mode only explains the findings.

## Quickstart

```bash
npx ai-ship-gate check
```

Useful options:

```bash
shipgate check --base main
shipgate check --format markdown
shipgate check --format json
shipgate check --ai
shipgate init
```

## Verdicts

- `PASS`: no warning or failure findings.
- `WARN`: risk found, but the default CI behavior does not block the PR.
- `FAIL`: high-risk issue found and the command exits with code 1.

## GitHub Action

```yaml
name: Ship Gate

on:
  pull_request:

jobs:
  shipgate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: owner-name/ai-ship-gate@v1
        with:
          base: main
          ai: false
```

## Example Findings

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

## Rules

- Test risk: source changes without tests, focused tests, skipped tests.
- Dependency risk: manifest changes without lockfiles, risky install scripts.
- Env risk: new env usage without examples, committed env files, secret-like values.
- CI and deploy risk: workflow, Docker, compose, or deployment config changes.
- Security risk: auth, permission, payment, crypto, CORS, SQL/query, upload, token, or session changes.

## Optional AI Mode

```bash
OPENAI_API_KEY=... shipgate check --ai
```

AI mode reads deterministic findings and writes a short explanation. It does not decide the verdict.

Environment variables:

- `OPENAI_API_KEY`
- `OPENAI_BASE_URL`
- `OPENAI_MODEL`

## Configuration

```yaml
failOn: fail
ai:
  enabled: false
checks:
  tests: true
  dependencies: true
  ci: true
  docker: true
  env: true
  security: true
```
```

- [ ] **Step 2: Add risky diff demo**

Create `examples/risky-diff.md` with:

```md
# Risky Diff Demo

This demo describes a pull request that AI Ship Gate should flag:

- `src/auth.ts` changes behavior.
- No `*.test.ts` or `tests/` files change.
- `src/config.ts` adds `process.env.OPENAI_API_KEY`.
- `.env.example` is not updated.
- `package.json` changes dependencies without `package-lock.json`.
- A patch includes `sk-1234567890abcdef1234567890abcdef`.

Expected verdict: `FAIL`.

Expected findings:

- `tests.missing-related-tests`
- `dependencies.lockfile-not-updated`
- `env.example-not-updated`
- `env.secret-like-value`
- `security.secret-in-diff`
```

- [ ] **Step 3: Commit README and demo docs**

Run:

```bash
git add README.md examples/risky-diff.md
git commit -m "docs: add README and risky diff demo"
```

Expected: commit succeeds.

---

### Task 12: End-to-End Verification and Release Hygiene

**Files:**
- Modify: `package.json`
- Modify: `README.md`
- Modify: files uncovered by verification failures

- [ ] **Step 1: Run the full automated suite**

Run:

```bash
npm test
npm run typecheck
npm run build
```

Expected: all commands PASS.

- [ ] **Step 2: Verify CLI help from built output**

Run:

```bash
node dist/cli.js --help
node dist/cli.js check --help
```

Expected: both commands print help text that includes `shipgate`, `check`, `--base`, `--format`, and `--ai`.

- [ ] **Step 3: Verify local CLI on this repository**

Run:

```bash
node dist/cli.js check --base HEAD --format markdown
```

Expected: command prints `# AI Ship Gate: PASS` because comparing `HEAD` to `HEAD` yields no changed files.

- [ ] **Step 4: Verify npm package contents**

Run:

```bash
npm pack --dry-run
```

Expected: output includes `dist/cli.js`, `dist/action.js`, `action.yml`, `README.md`, and `shipgate.config.example.yaml`.

- [ ] **Step 5: Fix verification failures with focused patches**

If any command above fails, edit only the file named by the failure. Examples:

```bash
npm test -- tests/rules/security.test.ts
```

Expected after each fix: the failing test command PASS before re-running the full suite.

- [ ] **Step 6: Commit verification fixes or release hygiene**

Run:

```bash
git add package.json package-lock.json README.md src tests action.yml shipgate.config.example.yaml examples dist
git commit -m "chore: prepare MVP for release"
```

Expected: commit succeeds if files changed. If no files changed after verification, skip this commit and record that the existing commits already pass verification.

---

## Self-Review Notes

- Spec coverage: the plan covers CLI, config, deterministic rules, verdicts, JSON/Markdown/terminal reporting, optional AI mode, GitHub Action wrapper, README, and verification.
- Scope control: PR comments, SARIF, AST analysis, automatic fixes, generated tests, dashboard, and SaaS behavior remain outside this MVP.
- Type consistency: internal verdicts are lowercase (`pass`, `warn`, `fail`) and reporters render uppercase for users.
- Execution order: tasks build from pure domain tests toward git integration, output, CLI, Action, and docs.
