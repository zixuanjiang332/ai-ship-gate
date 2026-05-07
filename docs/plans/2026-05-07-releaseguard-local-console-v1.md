# ReleaseGuard Local Console Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local browser-based ReleaseGuard console that opens with a polished demo, can run scans on a real local repository, and lets users change `base`, `failOn`, and core checks from the UI.

**Architecture:** Keep the existing deterministic scanning engine as the source of truth. Add a small local Node server plus a browser bundle built with the current TypeScript and esbuild toolchain, then expose the console through a new `releaseguard console` CLI command.

**Tech Stack:** TypeScript, existing Node runtime, esbuild, commander, Vitest, browser DOM APIs, local HTTP server via `node:http`.

---

## File Map

### Create

- `docs/plans/2026-05-07-releaseguard-local-console-v1.md` - implementation plan for the console feature.
- `src/console/contracts.ts` - shared request/response types for demo and local-run payloads.
- `src/console/demo.ts` - bundled demo payload returned on first load.
- `src/console/service.ts` - structured local-run service that reuses `runCheck` without writing terminal output.
- `src/console/server.ts` - local HTTP server that serves the console UI and API endpoints.
- `src/console/browser/index.html` - browser shell for the local console.
- `src/console/browser/main.ts` - browser controller for demo mode, run form, and results rendering.
- `src/console/browser/styles.css` - console styling for the dashboard experience.
- `scripts/build-console.mjs` - builds and copies console browser assets into `dist/console/`.
- `tests/console/demo.test.ts` - demo payload regression tests.
- `tests/console/service.test.ts` - structured scan response tests.
- `tests/console/server.test.ts` - API and static-file server tests.
- `tests/cli/console.test.ts` - CLI command tests for `releaseguard console`.

### Modify

- `src/cli.ts` - add the `console` command.
- `src/run.ts` - if needed, expose a tiny helper for structured execution reuse while preserving current CLI behavior.
- `src/domain/types.ts` - add any small types needed to describe effective config in UI responses.
- `package.json` - add console build/start scripts and include built console assets in the package.
- `README.md` - document the local console command and UI behavior.
- `docs/release.md` - note the local console in the next release checklist.
- `CHANGELOG.md` - add the local console entry for the upcoming version.

## Technical Direction

The implementation should stay close to the existing repository style:

- no frontend framework for v1
- no second package manager workspace
- no Vite dev server
- no Express dependency

Instead:

- bundle browser code with esbuild
- serve static assets from a small Node server
- use `fetch` from browser to hit local JSON endpoints
- ship the console through the existing CLI

This keeps the tool cohesive and avoids turning the repository into a multi-stack monorepo on the first UI pass.

## Task 1: Add console contracts and structured local-run service

**Files:**
- Create: `src/console/contracts.ts`
- Create: `src/console/service.ts`
- Create: `tests/console/service.test.ts`
- Modify: `src/domain/types.ts` (only if a small helper type is needed)

- [ ] **Step 1: Write the failing structured-service test**

Create `tests/console/service.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import type { GateContext } from "../../src/domain/types.js";
import { runConsoleCheck } from "../../src/console/service.js";

const context: GateContext = {
  repoRoot: "/repo",
  baseRef: "main",
  changedFiles: [
    { path: "src/auth.ts", status: "modified", patch: "+export const login = true;" },
  ],
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
    hasGitHubActions: true,
    hasEnvExample: true,
  },
};

describe("runConsoleCheck", () => {
  it("returns a UI-friendly structured result without writing terminal output", async () => {
    const runCheck = vi.fn().mockResolvedValue({
      context,
      report: {
        verdict: "warn",
        findings: [
          {
            id: "tests.missing-related-tests",
            severity: "warn",
            title: "Source changed without tests",
            message: "Source-like files changed, but this diff does not include test-like files.",
            files: ["src/auth.ts"],
            suggestion: "Add tests.",
          },
        ],
      },
      rendered: "# ReleaseGuard AI: WARN\n",
      exitCode: 0,
    });

    const result = await runConsoleCheck(
      {
        repoPath: "/repo",
        base: "main",
        failOn: "fail",
        checks: {
          tests: true,
          dependencies: true,
          env: true,
          ci: true,
          docker: true,
          security: true,
        },
      },
      runCheck,
    );

    expect(result.source).toBe("local");
    expect(result.repoPath).toBe("/repo");
    expect(result.baseRef).toBe("main");
    expect(result.verdict).toBe("warn");
    expect(result.findingsCount).toBe(1);
    expect(result.affectedFilesCount).toBe(1);
    expect(result.effectiveConfig.failOn).toBe("fail");
    expect(runCheck).toHaveBeenCalledWith(
      expect.objectContaining({
        cwd: "/repo",
        base: "main",
        format: "json",
        ai: false,
        write: expect.any(Function),
      }),
    );
  });
});
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `npm test -- tests/console/service.test.ts`

Expected: FAIL because `src/console/service.ts` does not exist.

- [ ] **Step 3: Write the minimal contracts and service**

Create `src/console/contracts.ts`:

```ts
import type { FailOn, Finding, Verdict } from "../domain/types.js";

export interface ConsoleChecks {
  tests: boolean;
  dependencies: boolean;
  env: boolean;
  ci: boolean;
  docker: boolean;
  security: boolean;
}

export interface ConsoleRunRequest {
  repoPath: string;
  base?: string;
  failOn: FailOn;
  checks: ConsoleChecks;
}

export interface ConsoleResult {
  source: "demo" | "local";
  repoPath: string;
  baseRef: string;
  verdict: Verdict;
  findings: Finding[];
  findingsCount: number;
  affectedFilesCount: number;
  counts: {
    fail: number;
    warn: number;
    info: number;
  };
  effectiveConfig: {
    failOn: FailOn;
    checks: ConsoleChecks;
  };
}
```

Create `src/console/service.ts`:

```ts
import type { ConsoleResult, ConsoleRunRequest } from "./contracts.js";
import { runCheck as defaultRunCheck } from "../run.js";

export async function runConsoleCheck(
  request: ConsoleRunRequest,
  runCheck: typeof defaultRunCheck = defaultRunCheck,
): Promise<ConsoleResult> {
  const result = await runCheck({
    cwd: request.repoPath,
    base: request.base,
    format: "json",
    ai: false,
    write: () => {},
  });

  const counts = result.report.findings.reduce(
    (summary, finding) => {
      summary[finding.severity] += 1;
      return summary;
    },
    { fail: 0, warn: 0, info: 0 },
  );

  return {
    source: "local",
    repoPath: result.context.repoRoot,
    baseRef: result.context.baseRef,
    verdict: result.report.verdict,
    findings: result.report.findings,
    findingsCount: result.report.findings.length,
    affectedFilesCount: new Set(result.report.findings.flatMap((finding) => finding.files)).size,
    counts,
    effectiveConfig: {
      failOn: request.failOn,
      checks: request.checks,
    },
  };
}
```

- [ ] **Step 4: Run the focused test to verify it passes**

Run: `npm test -- tests/console/service.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/console/contracts.ts src/console/service.ts tests/console/service.test.ts
git commit -m "feat(console): add structured local run service"
```

## Task 2: Add bundled demo payload

**Files:**
- Create: `src/console/demo.ts`
- Create: `tests/console/demo.test.ts`

- [ ] **Step 1: Write the failing demo test**

Create `tests/console/demo.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { consoleDemoResult } from "../../src/console/demo.js";

describe("consoleDemoResult", () => {
  it("ships a believable demo report for the dashboard first screen", () => {
    expect(consoleDemoResult.source).toBe("demo");
    expect(consoleDemoResult.verdict).toBe("fail");
    expect(consoleDemoResult.findingsCount).toBeGreaterThanOrEqual(3);
    expect(consoleDemoResult.affectedFilesCount).toBeGreaterThanOrEqual(2);
    expect(consoleDemoResult.findings.some((finding) => finding.id === "security.secret-in-diff")).toBe(true);
    expect(consoleDemoResult.findings.some((finding) => finding.id === "tests.missing-related-tests")).toBe(true);
  });
});
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `npm test -- tests/console/demo.test.ts`

Expected: FAIL because the demo module does not exist.

- [ ] **Step 3: Create the minimal demo fixture**

Create `src/console/demo.ts`:

```ts
import type { ConsoleResult } from "./contracts.js";

export const consoleDemoResult: ConsoleResult = {
  source: "demo",
  repoPath: "/demo/acme-api",
  baseRef: "origin/main",
  verdict: "fail",
  findingsCount: 4,
  affectedFilesCount: 3,
  counts: {
    fail: 1,
    warn: 3,
    info: 0,
  },
  effectiveConfig: {
    failOn: "fail",
    checks: {
      tests: true,
      dependencies: true,
      env: true,
      ci: true,
      docker: true,
      security: true,
    },
  },
  findings: [
    {
      id: "security.secret-in-diff",
      severity: "fail",
      title: "Secret-like value in diff",
      message: "The diff contains a token, key, password, or secret-like value.",
      files: ["src/config.ts"],
      suggestion: "Remove the value and rotate it before shipping.",
    },
    {
      id: "tests.missing-related-tests",
      severity: "warn",
      title: "Source changed without tests",
      message: "Source-like files changed, but this diff does not include test-like files.",
      files: ["src/auth.ts"],
      suggestion: "Add or update tests that cover the changed behavior before shipping.",
    },
    {
      id: "dependencies.lockfile-not-updated",
      severity: "warn",
      title: "Dependency manifest changed without lockfile",
      message: "A dependency manifest changed, but no recognized lockfile changed in the same diff.",
      files: ["package.json"],
      suggestion: "Update the lockfile before merging.",
    },
    {
      id: "env.example-not-updated",
      severity: "warn",
      title: "New environment variable usage lacks an example",
      message: "The diff adds environment variable usage without updating an env example or documentation.",
      files: ["src/env.ts"],
      suggestion: "Document the new variable in .env.example.",
    },
  ],
};
```

- [ ] **Step 4: Run the focused test to verify it passes**

Run: `npm test -- tests/console/demo.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/console/demo.ts tests/console/demo.test.ts
git commit -m "feat(console): add bundled dashboard demo"
```

## Task 3: Add the local console HTTP server and API endpoints

**Files:**
- Create: `src/console/server.ts`
- Create: `tests/console/server.test.ts`

- [ ] **Step 1: Write the failing server tests**

Create `tests/console/server.test.ts`:

```ts
import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createConsoleServer } from "../../src/console/server.js";

let repoDir = "";

afterEach(async () => {
  if (repoDir) await rm(repoDir, { recursive: true, force: true });
});

describe("createConsoleServer", () => {
  it("serves the demo payload", async () => {
    const server = await createConsoleServer({ port: 0 });
    try {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      const response = await fetch(`http://127.0.0.1:${port}/api/demo`);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.source).toBe("demo");
    } finally {
      await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve(undefined))));
    }
  });

  it("returns a structured local run result", async () => {
    repoDir = await mkdtemp(join(tmpdir(), "releaseguard-console-repo-"));
    await writeFile(join(repoDir, "package.json"), JSON.stringify({ name: "fixture", version: "1.0.0" }, null, 2));

    const server = await createConsoleServer({ port: 0 });
    try {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      const response = await fetch(`http://127.0.0.1:${port}/api/run`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          repoPath: repoDir,
          failOn: "fail",
          checks: {
            tests: true,
            dependencies: true,
            env: true,
            ci: true,
            docker: true,
            security: true,
          },
        }),
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.source).toBe("local");
      expect(body.repoPath).toBe(repoDir);
    } finally {
      await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve(undefined))));
    }
  });
});
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `npm test -- tests/console/server.test.ts`

Expected: FAIL because `src/console/server.ts` does not exist.

- [ ] **Step 3: Create the minimal local server**

Create `src/console/server.ts`:

```ts
import { createServer, type Server } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { consoleDemoResult } from "./demo.js";
import type { ConsoleRunRequest } from "./contracts.js";
import { runConsoleCheck } from "./service.js";

const assetRoot = join(fileURLToPath(new URL("../../dist/console/", import.meta.url)));

export async function createConsoleServer(options: { port: number }): Promise<Server> {
  const server = createServer(async (request, response) => {
    const url = new URL(request.url ?? "/", "http://127.0.0.1");

    if (request.method === "GET" && url.pathname === "/api/demo") {
      return json(response, 200, consoleDemoResult);
    }

    if (request.method === "POST" && url.pathname === "/api/run") {
      const body = await readJsonBody<ConsoleRunRequest>(request);
      const result = await runConsoleCheck(body);
      return json(response, 200, result);
    }

    const filePath = url.pathname === "/"
      ? join(assetRoot, "index.html")
      : join(assetRoot, url.pathname.replace(/^\/+/, ""));

    try {
      const file = await readFile(filePath);
      response.statusCode = 200;
      response.setHeader("content-type", contentTypeFor(filePath));
      response.end(file);
    } catch {
      json(response, 404, { error: "Not found" });
    }
  });

  await new Promise<void>((resolve) => server.listen(options.port, "127.0.0.1", () => resolve()));
  return server;
}

function json(response: import("node:http").ServerResponse, status: number, payload: unknown): void {
  response.statusCode = status;
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.end(JSON.stringify(payload));
}

async function readJsonBody<T>(request: import("node:http").IncomingMessage): Promise<T> {
  const chunks: Uint8Array[] = [];
  for await (const chunk of request) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as T;
}

function contentTypeFor(filePath: string): string {
  const extension = extname(filePath);
  if (extension === ".css") return "text/css; charset=utf-8";
  if (extension === ".js") return "text/javascript; charset=utf-8";
  return "text/html; charset=utf-8";
}
```

- [ ] **Step 4: Run the focused test to verify it passes**

Run: `npm test -- tests/console/server.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/console/server.ts tests/console/server.test.ts
git commit -m "feat(console): add local server and api"
```

## Task 4: Build the browser dashboard shell

**Files:**
- Create: `src/console/browser/index.html`
- Create: `src/console/browser/main.ts`
- Create: `src/console/browser/styles.css`
- Create: `scripts/build-console.mjs`

- [ ] **Step 1: Write the failing browser smoke test**

Extend `tests/console/server.test.ts` with:

```ts
  it("serves the dashboard shell", async () => {
    const server = await createConsoleServer({ port: 0 });
    try {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      const response = await fetch(`http://127.0.0.1:${port}/`);
      const body = await response.text();

      expect(response.status).toBe(200);
      expect(body).toContain("ReleaseGuard Local Console");
      expect(body).toContain("Run On Local Repo");
    } finally {
      await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve(undefined))));
    }
  });
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `npm test -- tests/console/server.test.ts`

Expected: FAIL because there are no browser assets to serve.

- [ ] **Step 3: Create the minimal browser shell and build script**

Create `src/console/browser/index.html`:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>ReleaseGuard Local Console</title>
    <link rel="stylesheet" href="/styles.css" />
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/app.js"></script>
  </body>
</html>
```

Create `src/console/browser/main.ts`:

```ts
import "./styles.css";

type DemoResponse = Awaited<ReturnType<typeof loadDemo>>;

void bootstrap();

async function bootstrap(): Promise<void> {
  const root = document.querySelector<HTMLDivElement>("#app");
  if (!root) return;

  const demo = await loadDemo();
  root.innerHTML = `
    <main class="shell">
      <header class="topbar">
        <div>
          <p class="eyebrow">Local Console</p>
          <h1>ReleaseGuard Local Console</h1>
        </div>
        <button id="switch-run" class="primary">Run On Local Repo</button>
      </header>
      <section class="hero">
        <div class="verdict verdict-${demo.verdict}">${demo.verdict.toUpperCase()}</div>
        <div class="stats">
          <div><span>Findings</span><strong>${demo.findingsCount}</strong></div>
          <div><span>Fail</span><strong>${demo.counts.fail}</strong></div>
          <div><span>Warn</span><strong>${demo.counts.warn}</strong></div>
          <div><span>Files</span><strong>${demo.affectedFilesCount}</strong></div>
        </div>
      </section>
      <section class="workspace">
        <aside class="findings">
          ${demo.findings.map((finding) => `<button class="finding" data-id="${finding.id}">${finding.title}</button>`).join("")}
        </aside>
        <article class="detail">
          <h2>${demo.findings[0]?.title ?? "No findings"}</h2>
          <p>${demo.findings[0]?.message ?? "No findings available."}</p>
          <p class="suggestion">${demo.findings[0]?.suggestion ?? ""}</p>
        </article>
      </section>
    </main>
  `;
}

async function loadDemo() {
  const response = await fetch("/api/demo");
  return response.json();
}
```

Create `src/console/browser/styles.css`:

```css
:root {
  color-scheme: dark;
  --bg: #0b1120;
  --panel: #111827;
  --muted: #93a4bf;
  --text: #e5edf7;
  --line: rgba(148, 163, 184, 0.16);
  --warn: #f59e0b;
  --fail: #fb7185;
  --pass: #22c55e;
}

* { box-sizing: border-box; }
body {
  margin: 0;
  font-family: Inter, ui-sans-serif, system-ui, sans-serif;
  background: linear-gradient(180deg, #0b1120 0%, #050816 100%);
  color: var(--text);
}
.shell { max-width: 1280px; margin: 0 auto; padding: 32px; }
.topbar, .hero, .workspace { display: grid; gap: 16px; }
.topbar { grid-template-columns: 1fr auto; align-items: center; }
.primary { background: #1d4ed8; color: white; border: 0; border-radius: 8px; padding: 12px 16px; }
.hero, .findings, .detail { background: var(--panel); border: 1px solid var(--line); border-radius: 8px; }
.hero { grid-template-columns: 220px 1fr; padding: 24px; }
.workspace { grid-template-columns: 320px 1fr; }
.findings, .detail { padding: 20px; }
```

Create `scripts/build-console.mjs`:

```js
import { mkdir, copyFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import esbuild from "esbuild";

const outdir = resolve("dist/console");
await mkdir(outdir, { recursive: true });

await esbuild.build({
  entryPoints: ["src/console/browser/main.ts"],
  bundle: true,
  platform: "browser",
  format: "esm",
  outfile: resolve(outdir, "app.js"),
});

await copyFile("src/console/browser/index.html", resolve(outdir, "index.html"));
await copyFile("src/console/browser/styles.css", resolve(outdir, "styles.css"));
```

- [ ] **Step 4: Run the focused test to verify it passes**

Run: `npm test -- tests/console/server.test.ts`

Expected: PASS after the assets are present and the server can serve them.

- [ ] **Step 5: Commit**

```bash
git add src/console/browser/index.html src/console/browser/main.ts src/console/browser/styles.css scripts/build-console.mjs tests/console/server.test.ts
git commit -m "feat(console): add browser dashboard shell"
```

## Task 5: Add real run controls and results rendering

**Files:**
- Modify: `src/console/browser/main.ts`
- Modify: `src/console/browser/styles.css`

- [ ] **Step 1: Write the failing real-run browser behavior test**

Add this lightweight behavior assertion to `tests/console/server.test.ts` by checking the shell contains the run controls:

```ts
      expect(body).toContain('id="repo-path"');
      expect(body).toContain('id="base-ref"');
      expect(body).toContain('id="run-check"');
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `npm test -- tests/console/server.test.ts`

Expected: FAIL because the controls are not in the shell yet.

- [ ] **Step 3: Add the run panel and live rendering logic**

Update `src/console/browser/main.ts`:

```ts
async function bootstrap(): Promise<void> {
  const root = document.querySelector<HTMLDivElement>("#app");
  if (!root) return;

  const demo = await loadDemo();
  root.innerHTML = `
    <main class="shell">
      <header class="topbar">
        <div>
          <p class="eyebrow">Local Console</p>
          <h1>ReleaseGuard Local Console</h1>
        </div>
        <button id="switch-run" class="primary">Run On Local Repo</button>
      </header>
      <section class="hero" id="summary"></section>
      <section class="run-panel">
        <label>Repository Path <input id="repo-path" placeholder="/path/to/repo" /></label>
        <label>Base Ref <input id="base-ref" value="origin/main" /></label>
        <label>Fail On
          <select id="fail-on">
            <option value="fail">fail</option>
            <option value="warn">warn</option>
          </select>
        </label>
        <fieldset class="checks">
          ${renderCheckToggle("tests")}
          ${renderCheckToggle("dependencies")}
          ${renderCheckToggle("env")}
          ${renderCheckToggle("ci")}
          ${renderCheckToggle("docker")}
          ${renderCheckToggle("security")}
        </fieldset>
        <button id="run-check" class="primary">Run Check</button>
        <p id="run-error" class="error" hidden></p>
      </section>
      <section class="workspace">
        <aside class="findings" id="findings"></aside>
        <article class="detail" id="detail"></article>
      </section>
    </main>
  `;

  renderResult(demo);
  document.querySelector<HTMLButtonElement>("#run-check")?.addEventListener("click", () => {
    void handleRun();
  });
}

function renderCheckToggle(name: string): string {
  return `<label class="toggle"><input type="checkbox" data-check="${name}" checked /> ${name}</label>`;
}

async function handleRun(): Promise<void> {
  const repoPath = (document.querySelector<HTMLInputElement>("#repo-path")?.value ?? "").trim();
  const base = (document.querySelector<HTMLInputElement>("#base-ref")?.value ?? "").trim();
  const failOn = (document.querySelector<HTMLSelectElement>("#fail-on")?.value ?? "fail") as "fail" | "warn";
  const checks = Object.fromEntries(
    Array.from(document.querySelectorAll<HTMLInputElement>('input[data-check]')).map((input) => [
      input.dataset.check ?? "",
      input.checked,
    ]),
  );

  const errorNode = document.querySelector<HTMLParagraphElement>("#run-error");
  if (errorNode) {
    errorNode.hidden = true;
    errorNode.textContent = "";
  }

  const response = await fetch("/api/run", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ repoPath, base, failOn, checks }),
  });

  if (!response.ok) {
    const body = await response.json();
    if (errorNode) {
      errorNode.hidden = false;
      errorNode.textContent = body.error ?? "Run failed.";
    }
    return;
  }

  const result = await response.json();
  renderResult(result);
}

function renderResult(result: any): void {
  const summary = document.querySelector<HTMLElement>("#summary");
  const findings = document.querySelector<HTMLElement>("#findings");
  const detail = document.querySelector<HTMLElement>("#detail");
  if (!summary || !findings || !detail) return;

  summary.innerHTML = `
    <div class="verdict verdict-${result.verdict}">${result.verdict.toUpperCase()}</div>
    <div class="stats">
      <div><span>Findings</span><strong>${result.findingsCount}</strong></div>
      <div><span>Fail</span><strong>${result.counts.fail}</strong></div>
      <div><span>Warn</span><strong>${result.counts.warn}</strong></div>
      <div><span>Files</span><strong>${result.affectedFilesCount}</strong></div>
    </div>
  `;

  findings.innerHTML = result.findings.map((finding: any, index: number) => `
    <button class="finding" data-index="${index}">
      <span class="finding-severity">${finding.severity.toUpperCase()}</span>
      <strong>${finding.title}</strong>
      <span>${finding.files.join(", ")}</span>
    </button>
  `).join("");

  const firstFinding = result.findings[0];
  detail.innerHTML = firstFinding ? `
    <h2>${firstFinding.title}</h2>
    <p>${firstFinding.message}</p>
    <p class="suggestion">${firstFinding.suggestion}</p>
    <p class="rule">Rule: ${firstFinding.id}</p>
  ` : `<h2>No findings</h2><p>No release risks detected.</p>`;
}
```

Update `src/console/browser/styles.css` with run panel layout:

```css
.run-panel {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  padding: 20px;
  margin: 20px 0;
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 8px;
}
.run-panel label { display: grid; gap: 8px; color: var(--muted); }
.run-panel input, .run-panel select {
  width: 100%;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid var(--line);
  background: #0f172a;
  color: var(--text);
}
.checks {
  grid-column: 1 / -1;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  border: 0;
  padding: 0;
  margin: 0;
}
.toggle { display: inline-flex; align-items: center; gap: 8px; }
.error { color: var(--fail); margin: 0; }
```

- [ ] **Step 4: Run the focused test to verify it passes**

Run: `npm test -- tests/console/server.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/console/browser/main.ts src/console/browser/styles.css tests/console/server.test.ts
git commit -m "feat(console): add local run controls"
```

## Task 6: Expose the console through the CLI and package build

**Files:**
- Modify: `src/cli.ts`
- Modify: `package.json`
- Create: `tests/cli/console.test.ts`
- Modify: `README.md`
- Modify: `docs/release.md`
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Write the failing CLI command tests**

Create `tests/cli/console.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { Command } from "commander";
import { buildProgram } from "../../src/cli.js";

describe("buildProgram", () => {
  it("registers the console command", () => {
    const program = buildProgram();
    const command = program.commands.find((entry) => entry.name() === "console");

    expect(command).toBeDefined();
    expect(command?.description()).toContain("local browser console");
  });
});
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `npm test -- tests/cli/console.test.ts`

Expected: FAIL because `buildProgram` or `console` command does not exist yet.

- [ ] **Step 3: Add the CLI command and build scripts**

Update `src/cli.ts`:

```ts
import { createConsoleServer } from "./console/server.js";
```

```ts
export function buildProgram(): Command {
  const program = new Command();

  program
    .name("releaseguard")
    .description("A deterministic PR diff release gate for AI-generated code.")
    .version("0.5.0");

  program
    .command("console")
    .description("Start the local browser console.")
    .option("--port <port>", "Port to listen on", "4319")
    .action(async (options: { port: string }) => {
      const port = Number(options.port);
      const server = await createConsoleServer({ port });
      const address = server.address();
      const resolvedPort = typeof address === "object" && address ? address.port : port;
      console.log(`ReleaseGuard Local Console: http://127.0.0.1:${resolvedPort}`);
    });

  return program;
}
```

```ts
const program = buildProgram();
```

Update `package.json`:

```json
"scripts": {
  "build": "tsc -p tsconfig.json && esbuild src/action.ts --bundle --platform=node --format=esm --target=node20 --outfile=dist/action.js --sourcemap --banner:js=\"import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);\" && node scripts/normalize-action-sourcemap.mjs dist/action.js.map && node scripts/build-console.mjs",
  "console": "node dist/cli.js console",
  "test": "vitest run",
  "test:watch": "vitest",
  "typecheck": "tsc -p tsconfig.json --noEmit"
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
```

Update docs so README includes:

```md
## Local Console

Start the local browser console:

```sh
npm run build
releaseguard console
```

Then open the printed local URL in your browser.
```

- [ ] **Step 4: Run the focused test to verify it passes**

Run: `npm test -- tests/cli/console.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/cli.ts package.json tests/cli/console.test.ts README.md docs/release.md CHANGELOG.md
git commit -m "feat(cli): expose local console"
```

## Task 7: Run full verification and refresh release artifacts

**Files:**
- Modify: `dist/**`
- Modify: any touched source/test/docs files if the full verification reveals issues

- [ ] **Step 1: Run the full test suite**

Run: `npm test`

Expected: PASS with all existing and new tests green.

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`

Expected: PASS with no type errors in core, server, or browser bundle entrypoints.

- [ ] **Step 3: Run the build**

Run: `npm run build`

Expected: PASS and generated console assets under `dist/console/`.

- [ ] **Step 4: Run package verification**

Run: `npm pack --dry-run`

Expected: PASS and package contents include:

- `dist/console/index.html`
- `dist/console/app.js`
- `dist/console/styles.css`
- `dist/console/server.js` if the console server is emitted as part of `tsc`

- [ ] **Step 5: Commit**

```bash
git add src tests scripts README.md docs package.json CHANGELOG.md dist
git commit -m "feat(console): add local browser dashboard"
```

## Spec Coverage Check

- Demo-first landing experience: covered by Task 2 and Task 4.
- Real local repository run path: covered by Task 1, Task 3, and Task 5.
- UI controls for `base`, `failOn`, and core checks: covered by Task 5.
- Quiet developer dashboard structure: covered by Task 4 and Task 5.
- Local-only architecture: covered by Task 3 and Task 6.
- One-command startup path: covered by Task 6.
- Reuse existing deterministic engine: covered by Task 1.

## Self-Review Notes

- The plan keeps the repository single-package and avoids introducing a frontend framework.
- The console is treated as a companion surface, not a rewrite of existing CLI behavior.
- The task split follows the real product shape: structured data, demo, server, UI shell, local run controls, CLI exposure, then full verification.
