# Inline Review Comments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add optional GitHub inline review comments for anchored ReleaseGuard AI findings, with conservative defaults and rerun-safe de-duplication.

**Architecture:** Reuse the existing deterministic rule engine and GitHub Action entrypoint, but extend the action path so it retains the collected `GateContext` needed for diff anchors. Add three focused modules: one for anchor resolution, one for inline review comment rendering, and one for GitHub review comment API integration plus dedupe.

**Tech Stack:** TypeScript, Vitest, GitHub Actions review comment REST API, existing ReleaseGuard rule engine and reporters.

---

## File Map

### Create

- `docs/plans/2026-05-06-inline-review-comments-v0-5.md` - implementation plan for the feature.
- `src/action/diffAnchors.ts` - resolves exact diff anchors from findings plus changed file patches.
- `src/action/reviewComments.ts` - lists existing review comments and creates missing ones.
- `src/reporters/reviewComment.ts` - renders short inline review comment bodies plus stable marker identity.
- `tests/action/diffAnchors.test.ts` - tests anchor resolution behavior.
- `tests/action/reviewComments.test.ts` - tests GitHub review comment API behavior and dedupe.
- `tests/reporters/reviewComment.test.ts` - tests inline comment rendering and sanitization.

### Modify

- `src/domain/types.ts` - add shared review comment and anchor types, and extend check results with context.
- `src/run.ts` - return `GateContext` alongside the existing report/rendered/exitCode values.
- `src/action.ts` - parse the new input, select eligible findings, resolve anchors, and call review comment publishing.
- `action.yml` - declare the new `review-comments` input.
- `README.md` - document modes and example workflow usage.
- `docs/release.md` - note the `0.5.0` release change.
- `package.json` - bump version to `0.5.0`.
- `tests/action/action.test.ts` - cover mode parsing and integration with the new publishing path.

## Task 1: Add shared types for action-side review comments

**Files:**
- Modify: `src/domain/types.ts`
- Modify: `src/run.ts`
- Test: `tests/action/action.test.ts`

- [ ] **Step 1: Write the failing test for `runCheck` returning context**

Add this assertion to the existing `runAction` integration test setup in `tests/action/action.test.ts` by stubbing `runCheck` to return a `context` field that `runAction` can later consume:

```ts
const runCheck = vi.fn().mockResolvedValue({
  context: {
    repoRoot: dir,
    baseRef: "origin/main",
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
      hasGitHubActions: true,
      hasEnvExample: true,
    },
  },
  report: { verdict: "pass", findings: [] },
  rendered: "# ReleaseGuard AI: PASS\n",
  exitCode: 0,
});
```

Expected failure before implementation: TypeScript or Vitest should complain that `context` is not part of `CheckResult`.

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `npm test -- tests/action/action.test.ts`

Expected: FAIL or type mismatch around `context` missing from the mocked `CheckResult`.

- [ ] **Step 3: Add the shared types and return context from `runCheck`**

Update `src/domain/types.ts` and `src/run.ts` with the minimal shape:

```ts
export interface CheckResult {
  context: GateContext;
  report: GateReport;
  rendered: string;
  exitCode: number;
}
```

```ts
return {
  context,
  report,
  rendered,
  exitCode: shouldExitWithFailure(verdict, config.failOn) ? 1 : 0,
};
```

- [ ] **Step 4: Run the focused test to verify it passes**

Run: `npm test -- tests/action/action.test.ts`

Expected: PASS for the updated test file.

- [ ] **Step 5: Commit**

```bash
git add src/domain/types.ts src/run.ts tests/action/action.test.ts
git commit -m "refactor: expose gate context in check results"
```

## Task 2: Render inline review comment bodies

**Files:**
- Create: `src/reporters/reviewComment.ts`
- Create: `tests/reporters/reviewComment.test.ts`

- [ ] **Step 1: Write the failing renderer tests**

Create `tests/reporters/reviewComment.test.ts` with:

```ts
import { describe, expect, it } from "vitest";
import type { Finding } from "../../src/domain/types.js";
import { renderReviewComment, reviewCommentMarkerPrefix } from "../../src/reporters/reviewComment.js";

const finding: Finding = {
  id: "tests.missing-related-tests",
  severity: "warn",
  title: "Source changed without tests",
  message: "Source changed but tests did not.",
  files: ["src/auth.ts"],
  suggestion: "Add tests for the changed behavior before shipping.",
};

describe("renderReviewComment", () => {
  it("renders a concise inline comment with a stable marker", () => {
    const body = renderReviewComment(finding, { file: "src/auth.ts", line: 17 });

    expect(body).toContain("ReleaseGuard AI:");
    expect(body).toContain("Rule: `tests.missing-related-tests`");
    expect(body).toContain("Suggestion: Add tests for the changed behavior before shipping.");
    expect(body).toContain(`${reviewCommentMarkerPrefix} rule=tests.missing-related-tests file=src/auth.ts anchor=17 -->`);
  });

  it("sanitizes Markdown-sensitive text", () => {
    const body = renderReviewComment(
      {
        ...finding,
        suggestion: "Escape [links](https://example.com) and `ticks`.",
      },
      { file: "src/auth.ts", line: 17 },
    );

    expect(body).not.toContain("[links](https://example.com)");
    expect(body).not.toContain("`ticks`");
  });
});
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `npm test -- tests/reporters/reviewComment.test.ts`

Expected: FAIL because the new reporter module does not exist.

- [ ] **Step 3: Write the minimal renderer**

Create `src/reporters/reviewComment.ts`:

```ts
import type { Finding } from "../domain/types.js";

export const reviewCommentMarkerPrefix = "<!-- releaseguard-ai-review-comment";

export function renderReviewComment(
  finding: Finding,
  anchor: { file: string; line: number },
): string {
  return [
    `ReleaseGuard AI: ${sanitizeLine(finding.message)}`,
    "",
    `Rule: ${formatInlineCode(finding.id)}`,
    `Suggestion: ${sanitizeLine(finding.suggestion)}`,
    `${reviewCommentMarkerPrefix} rule=${sanitizeAttr(finding.id)} file=${sanitizeAttr(anchor.file)} anchor=${anchor.line} -->`,
  ].join("\n");
}

function formatInlineCode(value: string): string {
  return `\`${sanitizeLine(value)}\``;
}

function sanitizeAttr(value: string): string {
  return value.replaceAll(/\s+/g, "_").replaceAll("--", "-");
}

function sanitizeLine(value: string): string {
  return value
    .replaceAll(/[\r\n]+/g, " ")
    .replaceAll("`", "\\`")
    .replaceAll("[", "\\[")
    .replaceAll("]", "\\]")
    .replaceAll("(", "\\(")
    .replaceAll(")", "\\)")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
```

- [ ] **Step 4: Run the focused test to verify it passes**

Run: `npm test -- tests/reporters/reviewComment.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/reporters/reviewComment.ts tests/reporters/reviewComment.test.ts
git commit -m "feat(reporters): render inline review comments"
```

## Task 3: Resolve diff anchors from findings

**Files:**
- Create: `src/action/diffAnchors.ts`
- Create: `tests/action/diffAnchors.test.ts`
- Modify: `src/domain/types.ts`

- [ ] **Step 1: Write failing anchor-resolution tests**

Create `tests/action/diffAnchors.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { ChangedFile, Finding } from "../../src/domain/types.js";
import { resolveReviewAnchor } from "../../src/action/diffAnchors.js";

describe("resolveReviewAnchor", () => {
  it("anchors secret findings to the matching added line", () => {
    const finding: Finding = {
      id: "security.secret-in-diff",
      severity: "fail",
      title: "Secret-like value in diff",
      message: "The diff contains a token-like value.",
      files: ["src/config.ts"],
      suggestion: "Remove it.",
    };
    const changedFiles: ChangedFile[] = [
      {
        path: "src/config.ts",
        status: "modified",
        patch: "@@ -1,1 +1,2 @@\n export const ok = true;\n+export const token = \"ghp_secret123\";\n",
      },
    ];

    expect(resolveReviewAnchor(finding, changedFiles)).toEqual({ file: "src/config.ts", line: 2 });
  });

  it("anchors missing-tests findings to the first added source line", () => {
    const finding: Finding = {
      id: "tests.missing-related-tests",
      severity: "warn",
      title: "Source changed without tests",
      message: "Source changed but tests did not.",
      files: ["src/auth.ts"],
      suggestion: "Add tests.",
    };
    const changedFiles: ChangedFile[] = [
      {
        path: "src/auth.ts",
        status: "modified",
        patch: "@@ -10,2 +10,3 @@\n export function login() {\n+  return true;\n }\n",
      },
    ];

    expect(resolveReviewAnchor(finding, changedFiles)).toEqual({ file: "src/auth.ts", line: 11 });
  });

  it("skips findings without an exact added line", () => {
    const finding: Finding = {
      id: "env.example-not-updated",
      severity: "warn",
      title: "Environment example not updated",
      message: "A new env var was added without updating the example.",
      files: ["src/env.ts"],
      suggestion: "Update .env.example.",
    };
    const changedFiles: ChangedFile[] = [
      {
        path: "src/env.ts",
        status: "modified",
        patch: "",
      },
    ];

    expect(resolveReviewAnchor(finding, changedFiles)).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `npm test -- tests/action/diffAnchors.test.ts`

Expected: FAIL because `resolveReviewAnchor` does not exist.

- [ ] **Step 3: Implement the minimal anchor resolver**

Create `src/action/diffAnchors.ts` and add a small shared type in `src/domain/types.ts`:

```ts
export interface ReviewAnchor {
  file: string;
  line: number;
}
```

```ts
import type { ChangedFile, Finding, ReviewAnchor } from "../domain/types.js";

export function resolveReviewAnchor(finding: Finding, changedFiles: ChangedFile[]): ReviewAnchor | undefined {
  const changedFile = changedFiles.find((file) => finding.files.includes(file.path));
  if (!changedFile || !changedFile.patch) return undefined;

  if (finding.id === "security.secret-in-diff") {
    return firstAddedLine(changedFile);
  }
  if (finding.id === "tests.missing-related-tests") {
    return firstAddedLine(changedFile);
  }
  if (finding.id === "dependencies.lockfile-not-updated") {
    return firstAddedLine(changedFile);
  }
  if (finding.id === "env.example-not-updated") {
    return firstAddedLine(changedFile);
  }

  return undefined;
}

function firstAddedLine(changedFile: ChangedFile): ReviewAnchor | undefined {
  let newLine = 0;

  for (const line of changedFile.patch.split("\n")) {
    const hunk = /^@@ -\d+(?:,\d+)? \+(\d+)/.exec(line);
    if (hunk) {
      newLine = Number(hunk[1]);
      continue;
    }
    if (line.startsWith("+") && !line.startsWith("+++")) {
      return { file: changedFile.path, line: newLine };
    }
    if (!line.startsWith("-")) {
      newLine += 1;
    }
  }

  return undefined;
}
```

- [ ] **Step 4: Run the focused test to verify it passes**

Run: `npm test -- tests/action/diffAnchors.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/action/diffAnchors.ts src/domain/types.ts tests/action/diffAnchors.test.ts
git commit -m "feat(action): resolve inline review anchors"
```

## Task 4: Publish review comments with rerun-safe dedupe

**Files:**
- Create: `src/action/reviewComments.ts`
- Create: `tests/action/reviewComments.test.ts`

- [ ] **Step 1: Write failing API and dedupe tests**

Create `tests/action/reviewComments.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { publishReviewComments } from "../../src/action/reviewComments.js";

describe("publishReviewComments", () => {
  it("creates a new review comment when no matching marker exists", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify([{ id: 1, body: "other", path: "src/app.ts" }]), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 9 }), { status: 201 }));

    await publishReviewComments(
      {
        owner: "zixuanjiang332",
        repo: "releaseguard-ai",
        pullNumber: 17,
        commitId: "abc123",
        token: "token",
      },
      [
        {
          body: "review body\n<!-- releaseguard-ai-review-comment rule=tests.missing-related-tests file=src/app.ts anchor=11 -->",
          file: "src/app.ts",
          line: 11,
        },
      ],
      fetchImpl,
    );

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(fetchImpl.mock.calls[1]?.[0]).toContain("/pulls/17/comments");
    expect(fetchImpl.mock.calls[1]?.[1]).toMatchObject({ method: "POST" });
  });

  it("skips creating a duplicate marker-matched review comment", async () => {
    const marker = "<!-- releaseguard-ai-review-comment rule=tests.missing-related-tests file=src/app.ts anchor=11 -->";
    const fetchImpl = vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify([{ id: 1, body: `review body\n${marker}`, path: "src/app.ts" }]), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    await publishReviewComments(
      {
        owner: "zixuanjiang332",
        repo: "releaseguard-ai",
        pullNumber: 17,
        commitId: "abc123",
        token: "token",
      },
      [{ body: `review body\n${marker}`, file: "src/app.ts", line: 11 }],
      fetchImpl,
    );

    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `npm test -- tests/action/reviewComments.test.ts`

Expected: FAIL because `publishReviewComments` does not exist.

- [ ] **Step 3: Implement the minimal review comment publisher**

Create `src/action/reviewComments.ts`:

```ts
interface ReviewCommentTarget {
  owner: string;
  repo: string;
  pullNumber: number;
  commitId: string;
  token: string;
}

interface ReviewCommentPayload {
  body: string;
  file: string;
  line: number;
}

interface ExistingReviewComment {
  id: number;
  body: string;
}

export async function publishReviewComments(
  target: ReviewCommentTarget,
  comments: ReviewCommentPayload[],
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  const existing = await request(
    `https://api.github.com/repos/${target.owner}/${target.repo}/pulls/${target.pullNumber}/comments?per_page=100`,
    {
      method: "GET",
      headers: jsonHeaders(target.token),
    },
    fetchImpl,
  ) as ExistingReviewComment[];

  for (const comment of comments) {
    if (existing.some((entry) => entry.body.includes(markerIdentity(comment.body)))) continue;

    await request(
      `https://api.github.com/repos/${target.owner}/${target.repo}/pulls/${target.pullNumber}/comments`,
      {
        method: "POST",
        headers: jsonHeaders(target.token),
        body: JSON.stringify({
          body: comment.body,
          commit_id: target.commitId,
          path: comment.file,
          line: comment.line,
          side: "RIGHT",
        }),
      },
      fetchImpl,
    );
  }
}

function markerIdentity(body: string): string {
  const marker = body.split("\n").find((line) => line.includes("releaseguard-ai-review-comment"));
  return marker ?? body;
}

async function request(url: string, init: RequestInit, fetchImpl: typeof fetch): Promise<unknown> {
  const response = await fetchImpl(url, init);
  if (!response.ok) {
    throw new Error(`GitHub review comment request failed: ${response.status} ${response.statusText}`);
  }
  return response.status === 204 ? undefined : response.json();
}

function jsonHeaders(token: string): HeadersInit {
  return {
    authorization: `Bearer ${token}`,
    accept: "application/vnd.github+json",
    "content-type": "application/json",
    "user-agent": "releaseguard-ai",
  };
}
```

- [ ] **Step 4: Run the focused test to verify it passes**

Run: `npm test -- tests/action/reviewComments.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/action/reviewComments.ts tests/action/reviewComments.test.ts
git commit -m "feat(action): publish inline review comments"
```

## Task 5: Wire review comment modes into the GitHub Action

**Files:**
- Modify: `src/action.ts`
- Modify: `action.yml`
- Modify: `tests/action/action.test.ts`

- [ ] **Step 1: Write failing action tests for mode parsing and publishing**

Add these tests to `tests/action/action.test.ts`:

```ts
it("declares a review-comments input with a safe default", async () => {
  const action = parse(await readFile("action.yml", "utf8"));

  expect(action.inputs["review-comments"].default).toBe("off");
  expect(action.inputs["review-comments"].description).toContain("inline review comments");
});

it("does not publish inline review comments by default", async () => {
  const runCheck = vi.fn().mockResolvedValue({
    context: {
      repoRoot: dir,
      baseRef: "origin/main",
      changedFiles: [],
      metadata: baseMetadata,
    },
    report: { verdict: "fail", findings: [] },
    rendered: "# ReleaseGuard AI: FAIL\n",
    exitCode: 1,
  });
  const publishReviewComments = vi.fn();

  await runAction({
    env: {
      GITHUB_WORKSPACE: dir,
      GITHUB_EVENT_NAME: "pull_request",
    },
    runCheck,
    publishReviewComments,
  });

  expect(publishReviewComments).not.toHaveBeenCalled();
});

it("publishes smart-mode review comments only for supported anchored findings", async () => {
  const runCheck = vi.fn().mockResolvedValue({
    context: {
      repoRoot: dir,
      baseRef: "origin/main",
      changedFiles: [
        {
          path: "src/auth.ts",
          status: "modified",
          patch: "@@ -1 +1,2 @@\n export const x = 1;\n+export const y = 2;\n",
        },
      ],
      metadata: baseMetadata,
    },
    report: {
      verdict: "warn",
      findings: [
        {
          id: "tests.missing-related-tests",
          severity: "warn",
          title: "Source changed without tests",
          message: "Source changed but tests did not.",
          files: ["src/auth.ts"],
          suggestion: "Add tests.",
        },
      ],
    },
    rendered: "# ReleaseGuard AI: WARN\n",
    exitCode: 0,
  });
  const publishReviewComments = vi.fn().mockResolvedValue(undefined);
  const eventPath = join(dir, "event.json");

  await writeFile(
    eventPath,
    JSON.stringify({
      pull_request: { number: 42, head: { sha: "abc123" } },
      repository: { owner: { login: "zixuanjiang332" }, name: "releaseguard-ai" },
    }),
  );

  await runAction({
    env: {
      GITHUB_WORKSPACE: dir,
      GITHUB_EVENT_NAME: "pull_request",
      GITHUB_EVENT_PATH: eventPath,
      GITHUB_TOKEN: "token",
      INPUT_REVIEW_COMMENTS: "smart",
    },
    runCheck,
    publishReviewComments,
  });

  expect(publishReviewComments).toHaveBeenCalledTimes(1);
});
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `npm test -- tests/action/action.test.ts`

Expected: FAIL because `review-comments` is not parsed or published yet.

- [ ] **Step 3: Implement minimal action wiring**

Update `src/action.ts` and `action.yml`:

```ts
type ReviewCommentsMode = "off" | "fail-only" | "smart" | "always";
```

```ts
const reviewCommentsMode = normalizeReviewCommentsMode(
  env.INPUT_REVIEW_COMMENTS ?? env["INPUT_REVIEW-COMMENTS"],
);
```

```ts
if (shouldPublishReviewComments(reviewCommentsMode, env.GITHUB_EVENT_NAME)) {
  const target = await readPullRequestReviewTarget(env);
  if (target) {
    const candidates = selectReviewCommentFindings(reviewCommentsMode, result.report.findings);
    const comments = candidates
      .map((finding) => {
        const anchor = resolveReviewAnchor(finding, result.context.changedFiles);
        if (!anchor) return undefined;
        return {
          body: renderReviewComment(finding, anchor),
          file: anchor.file,
          line: anchor.line,
        };
      })
      .filter((comment): comment is NonNullable<typeof comment> => Boolean(comment));

    if (comments.length > 0) {
      await publishReviewComments({ ...target, token: env.GITHUB_TOKEN ?? "" }, comments);
    }
  }
}
```

```ts
function selectReviewCommentFindings(mode: ReviewCommentsMode, findings: Finding[]): Finding[] {
  const smartAllowlist = new Set([
    "security.secret-in-diff",
    "dependencies.lockfile-not-updated",
    "env.example-not-updated",
    "tests.missing-related-tests",
  ]);

  if (mode === "always") return findings;
  if (mode === "fail-only") return findings.filter((finding) => finding.severity === "fail");
  if (mode === "smart") {
    return findings.filter((finding) => finding.severity === "fail" || smartAllowlist.has(finding.id));
  }
  return [];
}
```

```yaml
  review-comments:
    description: "Optional inline review comment mode: off, fail-only, smart, or always."
    required: false
    default: "off"
```

- [ ] **Step 4: Run the focused test to verify it passes**

Run: `npm test -- tests/action/action.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/action.ts action.yml tests/action/action.test.ts
git commit -m "feat(action): add inline review comment modes"
```

## Task 6: Document and version the feature

**Files:**
- Modify: `README.md`
- Modify: `docs/release.md`
- Modify: `package.json`

- [ ] **Step 1: Write the failing documentation assertions**

Add a lightweight documentation check to `tests/action/action.test.ts` or create `tests/docs/readme.test.ts` with:

```ts
it("documents the review-comments input in the README workflow example", async () => {
  const readme = await readFile("README.md", "utf8");

  expect(readme).toContain("review-comments: smart");
  expect(readme).toContain("fail-only");
  expect(readme).toContain("always");
});
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `npm test -- tests/action/action.test.ts`

Expected: FAIL because README does not mention the new input yet.

- [ ] **Step 3: Update docs and version**

Patch the release-facing files:

```json
"version": "0.5.0"
```

```md
The Action supports a separate `review-comments` input for inline GitHub review comments.

- `off`: never create inline review comments
- `fail-only`: create inline review comments only for fail findings
- `smart`: create inline review comments for fail findings plus the highest-value warn findings
- `always`: create inline review comments for any anchorable finding
```

```yaml
      - id: releaseguard
        uses: zixuanjiang332/releaseguard-ai@v0.5.0
        with:
          base: origin/main
          ai: false
          pr-comment: on-failure
          review-comments: smart
```

- [ ] **Step 4: Run the focused test to verify it passes**

Run: `npm test -- tests/action/action.test.ts`

Expected: PASS for the README assertion.

- [ ] **Step 5: Commit**

```bash
git add README.md docs/release.md package.json tests/action/action.test.ts
git commit -m "docs: describe inline review comments"
```

## Task 7: Run the full release-quality verification

**Files:**
- Modify: any touched files from previous tasks if fixes are needed

- [ ] **Step 1: Run the full test suite**

Run: `npm test`

Expected: PASS with all tests green.

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`

Expected: PASS with no type errors.

- [ ] **Step 3: Run the build**

Run: `npm run build`

Expected: PASS and updated `dist/` artifacts for the action bundle.

- [ ] **Step 4: Run package verification**

Run: `npm pack --dry-run`

Expected: PASS and expected release files only.

- [ ] **Step 5: Commit final build artifacts and fixes**

```bash
git add src action.yml tests README.md docs package.json dist
git commit -m "feat(action): add inline review comments"
```

## Spec Coverage Check

- New `review-comments` input: covered by Task 5 and Task 6.
- `off | fail-only | smart | always` modes: covered by Task 5.
- Smart-mode allowlist: covered by Task 5.
- Exact diff anchors only: covered by Task 3 and Task 5.
- Inline renderer with stable marker identity: covered by Task 2.
- GitHub API creation and rerun dedupe: covered by Task 4.
- Preserve existing summary and PR comment behavior: covered by Task 5 integration tests and Task 7 full verification.
- Release bump to `0.5.0`: covered by Task 6.

## Self-Review Notes

- No placeholder text remains in implementation steps.
- The plan reuses current module boundaries and avoids broad refactors.
- The main structural decision is explicit: `runCheck` must return `GateContext` so action-mode anchor resolution does not need to rerun git diff collection.

