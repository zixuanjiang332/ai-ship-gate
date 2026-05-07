# ReleaseGuard Local Console UI Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Polish the Local Console so the first screen feels like a release-review desk: clear decision first, prioritized findings second, and evidence workspace third.

**Architecture:** Keep the current local-only console architecture and deterministic engine intact. Limit this pass to browser presentation, small view-model helpers, and demo ordering/copy so the product becomes more persuasive without expanding scope.

**Tech Stack:** TypeScript, browser DOM APIs, current `dist/console` build flow, Vitest.

---

## File Map

### Create

- `docs/plans/2026-05-07-local-console-ui-polish-v1.md` - implementation plan for the UI polish pass.
- `tests/console/browserSummary.test.ts` - release-summary and prioritization helper tests if helper extraction is needed.

### Modify

- `src/console/browser/index.html` - refine the structural layout for the decision header and queue framing.
- `src/console/browser/main.ts` - add release summary generation, top-priority treatment, and stronger default triage behavior.
- `src/console/browser/styles.css` - tune hierarchy, emphasis, spacing, and screenshot quality.
- `src/console/demo.ts` - refine finding order or copy only if needed to support the narrative-first demo.
- `tests/console/demo.test.ts` - keep demo expectations aligned if finding order or copy changes.
- `tests/console/server.test.ts` - verify any meaningful shell behavior changes such as collapsed panel framing or stronger default content.

## Technical Direction

This is a presentation and interaction pass, not a data-model rewrite.

The implementation should:

- preserve the current APIs
- keep demo and local run flows identical at the data level
- derive a release summary sentence from existing `ConsoleResult`
- treat the top finding as the default review anchor
- improve hierarchy through structure and CSS rather than adding charts or a second navigation system

Prefer extracting tiny pure helper functions inside `main.ts` or into a small browser-only helper only if the rendering logic becomes hard to follow.

## Task 1: Add release-summary and prioritization helpers

**Files:**
- Modify: `src/console/browser/main.ts`
- Create: `tests/console/browserSummary.test.ts`

- [ ] **Step 1: Write the failing helper tests**

Create `tests/console/browserSummary.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { ConsoleResult } from "../../src/console/contracts.js";
import { buildReleaseSummary, getPriorityFindingIndexes } from "../../src/console/browser/main.js";

const baseResult: ConsoleResult = {
  source: "demo",
  repoPath: "/demo/acme-api",
  baseRef: "origin/main",
  verdict: "fail",
  findingsCount: 3,
  affectedFilesCount: 3,
  counts: { fail: 1, warn: 2, info: 0 },
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
  files: [],
  findings: [
    {
      id: "security.secret-in-diff",
      severity: "fail",
      title: "Secret-like value in diff",
      message: "A token is in the diff.",
      files: ["src/config.ts"],
      suggestion: "Rotate it.",
    },
    {
      id: "tests.missing-related-tests",
      severity: "warn",
      title: "Source changed without tests",
      message: "Tests are missing.",
      files: ["src/auth.ts"],
      suggestion: "Add tests.",
    },
    {
      id: "dependencies.lockfile-not-updated",
      severity: "warn",
      title: "Manifest changed without lockfile",
      message: "Lockfile drift detected.",
      files: ["package.json"],
      suggestion: "Refresh lockfile.",
    },
  ],
};

describe("buildReleaseSummary", () => {
  it("renders a natural-language fail summary", () => {
    expect(buildReleaseSummary(baseResult)).toContain("blocked");
    expect(buildReleaseSummary(baseResult)).toContain("credential");
  });

  it("renders a natural-language pass summary", () => {
    expect(
      buildReleaseSummary({
        ...baseResult,
        verdict: "pass",
        findings: [],
        findingsCount: 0,
        affectedFilesCount: 0,
        counts: { fail: 0, warn: 0, info: 0 },
      }),
    ).toContain("clear");
  });
});

describe("getPriorityFindingIndexes", () => {
  it("sorts fail findings ahead of warn findings", () => {
    expect(getPriorityFindingIndexes(baseResult)).toEqual([0, 1, 2]);
  });
});
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `npm test -- tests/console/browserSummary.test.ts`

Expected: FAIL because the helper exports do not exist yet.

- [ ] **Step 3: Add the minimal helper exports**

Update `src/console/browser/main.ts` near the top or bottom with pure helpers:

```ts
export function getPriorityFindingIndexes(result: ConsoleResult): number[] {
  return result.findings
    .map((finding, index) => ({ finding, index }))
    .sort((left, right) => severityRank(right.finding.severity) - severityRank(left.finding.severity) || left.index - right.index)
    .map((entry) => entry.index);
}

export function buildReleaseSummary(result: ConsoleResult): string {
  if (result.verdict === "fail") {
    return `Release is blocked by ${result.counts.fail} fail-severity risk${result.counts.fail === 1 ? "" : "s"} and ${result.counts.warn} follow-up warning${result.counts.warn === 1 ? "" : "s"}.`;
  }

  if (result.verdict === "warn") {
    return `Release is still open, but ${result.counts.warn} warning${result.counts.warn === 1 ? "" : "s"} should be reviewed before merge.`;
  }

  return "Release is clear. No deterministic risks were found in this change set.";
}

function severityRank(severity: ConsoleResult["findings"][number]["severity"]): number {
  switch (severity) {
    case "fail":
      return 3;
    case "warn":
      return 2;
    default:
      return 1;
  }
}
```

- [ ] **Step 4: Run the focused test to verify it passes**

Run: `npm test -- tests/console/browserSummary.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/console/browser/main.ts tests/console/browserSummary.test.ts
git commit -m "feat(console): add release summary helpers"
```

## Task 2: Turn the summary band into a decision header

**Files:**
- Modify: `src/console/browser/index.html`
- Modify: `src/console/browser/main.ts`
- Modify: `src/console/browser/styles.css`

- [ ] **Step 1: Write the failing shell expectation**

Add to `tests/console/server.test.ts` inside the static shell test:

```ts
expect(body).toContain('id="summary-status"');
expect(body).toContain('id="summary-metrics"');
```

Also add a stronger browser summary expectation to `tests/console/demo.test.ts` by checking the demo still contains enough findings for a top-priority queue:

```ts
expect(consoleDemoResult.findings.length).toBeGreaterThanOrEqual(3);
```

- [ ] **Step 2: Run the focused tests to verify the new expectations**

Run: `npm test -- tests/console/server.test.ts tests/console/demo.test.ts`

Expected: PASS or FAIL only if shell structure drifted. If it already passes, continue with implementation without broadening scope.

- [ ] **Step 3: Update summary rendering to include a release summary sentence**

Update the `renderSummary()` block in `src/console/browser/main.ts`:

```ts
const releaseSummary = buildReleaseSummary(result);

statusNode.innerHTML = `
  <div class="verdict-badge verdict-${result.verdict}">${result.verdict.toUpperCase()}</div>
  <div class="status-copy">
    <p class="status-label">${result.source === "demo" ? "Review Desk Demo" : "Local Review Result"}</p>
    <h2>${escapeHtml(releaseSummary)}</h2>
    <p class="status-context">
      ${escapeHtml(result.repoPath)} · Base ref: <strong>${escapeHtml(result.baseRef)}</strong> · Fail on: <strong>${escapeHtml(result.effectiveConfig.failOn)}</strong>
    </p>
  </div>
`;
```

Update `src/console/browser/styles.css` to support a stronger header:

```css
.status-copy {
  display: grid;
  gap: 10px;
}

.status-copy h2 {
  font-size: 28px;
  line-height: 1.2;
  max-width: 14ch;
}

.status-context {
  color: var(--muted-strong);
  line-height: 1.5;
}
```

- [ ] **Step 4: Run the focused tests and typecheck**

Run: `npm test -- tests/console/demo.test.ts tests/console/server.test.ts tests/console/browserSummary.test.ts`

Expected: PASS.

Run: `npm run typecheck`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/console/browser/index.html src/console/browser/main.ts src/console/browser/styles.css tests/console/server.test.ts tests/console/demo.test.ts tests/console/browserSummary.test.ts
git commit -m "feat(console): strengthen decision header"
```

## Task 3: Add a top-priority queue treatment to findings

**Files:**
- Modify: `src/console/browser/main.ts`
- Modify: `src/console/browser/styles.css`

- [ ] **Step 1: Write the failing behavior expectation**

Add a rendering-focused assertion to `tests/console/browserSummary.test.ts`:

```ts
it("keeps the top finding first in the priority queue", () => {
  const indexes = getPriorityFindingIndexes(baseResult);
  expect(baseResult.findings[indexes[0]]?.severity).toBe("fail");
});
```

- [ ] **Step 2: Run the focused test to confirm the expectation**

Run: `npm test -- tests/console/browserSummary.test.ts`

Expected: PASS if helper behavior is already correct. Continue with rendering changes.

- [ ] **Step 3: Update findings rendering to emphasize the first three items**

Update the findings render loop in `src/console/browser/main.ts`:

```ts
const priorityIndexes = getPriorityFindingIndexes(result);

findingsNode.innerHTML = priorityIndexes
  .map((findingIndex, queueIndex) => {
    const finding = result.findings[findingIndex];
    const active = findingIndex === selectedFindingIndex ? " is-active" : "";
    const featured = queueIndex === 0 ? " is-featured" : "";
    const cue =
      queueIndex === 0 ? "Review first" :
      queueIndex === 1 ? "Review next" :
      queueIndex === 2 ? "Follow-up" :
      "Queued";

    return `
      <button class="finding-row${active}${featured}" type="button" data-finding-index="${findingIndex}">
        <div class="finding-row-top">
          <span class="finding-severity severity-${finding.severity}">${finding.severity.toUpperCase()}</span>
          <span class="finding-cue">${cue}</span>
        </div>
        <strong>${escapeHtml(finding.title)}</strong>
        <span class="finding-rule">${escapeHtml(finding.id)}</span>
        <span class="finding-files">${escapeHtml(finding.files.join(", "))}</span>
      </button>
    `;
  })
  .join("");
```

Add CSS in `src/console/browser/styles.css`:

```css
.finding-row-top {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}

.finding-cue {
  color: var(--muted-strong);
  font-size: 12px;
}

.finding-row.is-featured {
  border-color: rgba(94, 167, 255, 0.28);
  box-shadow: inset 0 0 0 1px rgba(94, 167, 255, 0.08);
}
```

- [ ] **Step 4: Run tests and typecheck**

Run: `npm test -- tests/console/browserSummary.test.ts tests/console/server.test.ts`

Expected: PASS.

Run: `npm run typecheck`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/console/browser/main.ts src/console/browser/styles.css tests/console/browserSummary.test.ts tests/console/server.test.ts
git commit -m "feat(console): add prioritized findings queue"
```

## Task 4: Make the detail pane feel like the primary review workspace

**Files:**
- Modify: `src/console/browser/main.ts`
- Modify: `src/console/browser/styles.css`

- [ ] **Step 1: Write the failing expectation for stronger detail labeling**

Add to `tests/console/server.test.ts` inside the shell test:

```ts
expect(body).toContain('id="detail-title"');
expect(body).toContain('id="detail-subtitle"');
```

- [ ] **Step 2: Run the focused test to verify the shell still exposes the right anchors**

Run: `npm test -- tests/console/server.test.ts`

Expected: PASS.

- [ ] **Step 3: Improve detail hierarchy and evidence labeling**

Update `renderDetail()` in `src/console/browser/main.ts`:

```ts
subtitleNode.textContent = `Rule ${finding.id} · ${finding.files.length} file${finding.files.length === 1 ? "" : "s"} touched`;
```

Update the detail markup blocks so the labels read more like reviewer steps:

```ts
<div class="detail-block">
  <h4>Why it matters</h4>
  <p>${escapeHtml(finding.message)}</p>
</div>
<div class="detail-block">
  <h4>Suggested next action</h4>
  <p>${escapeHtml(finding.suggestion)}</p>
</div>
```

Update `src/console/browser/styles.css`:

```css
.detail-pane {
  border-color: rgba(94, 167, 255, 0.22);
}

.detail-block h4 {
  font-size: 13px;
  color: var(--muted);
  text-transform: uppercase;
}
```

- [ ] **Step 4: Run focused tests and typecheck**

Run: `npm test -- tests/console/server.test.ts tests/console/browserSummary.test.ts`

Expected: PASS.

Run: `npm run typecheck`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/console/browser/main.ts src/console/browser/styles.css tests/console/server.test.ts
git commit -m "feat(console): polish review workspace detail pane"
```

## Task 5: Keep the run panel secondary but polished

**Files:**
- Modify: `src/console/browser/main.ts`
- Modify: `src/console/browser/styles.css`

- [ ] **Step 1: Write the failing behavior expectation for the collapsed-first interaction**

Add a shell-level expectation to `tests/console/server.test.ts`:

```ts
expect(body).toContain('id="run-band"');
```

The shell already includes this, so this step acts as a guard rather than a true red test.

- [ ] **Step 2: Run the focused test**

Run: `npm test -- tests/console/server.test.ts`

Expected: PASS.

- [ ] **Step 3: Improve the secondary action treatment**

Update `src/console/browser/styles.css`:

```css
.ghost-button {
  transition: border-color 160ms ease, background 160ms ease;
}

.ghost-button:hover {
  border-color: rgba(94, 167, 255, 0.44);
  background: rgba(94, 167, 255, 0.14);
}

.run-band {
  background: linear-gradient(180deg, rgba(13, 23, 40, 0.98) 0%, rgba(12, 22, 38, 0.92) 100%);
}
```

Update the status copy in `main.ts` after successful run:

```ts
setRunStatus(`Ready. Last run reviewed ${result.findingsCount} finding${result.findingsCount === 1 ? "" : "s"} in ${result.repoPath}.`);
```

- [ ] **Step 4: Run focused tests and rebuild**

Run: `npm test -- tests/console/server.test.ts tests/console/browserSummary.test.ts`

Expected: PASS.

Run: `npm run build`

Expected: PASS and refreshed `dist/console/*`.

- [ ] **Step 5: Commit**

```bash
git add src/console/browser/main.ts src/console/browser/styles.css dist/console
git commit -m "feat(console): polish local run panel treatment"
```

## Task 6: Full verification and artifact refresh

**Files:**
- Modify: `dist/console/**`
- Modify: any touched browser/tests/docs files if verification reveals issues

- [ ] **Step 1: Run the full test suite**

Run: `npm test`

Expected: PASS with all existing and new tests green.

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`

Expected: PASS.

- [ ] **Step 3: Run the build**

Run: `npm run build`

Expected: PASS and refreshed `dist/console/index.html`, `dist/console/app.js`, and `dist/console/styles.css`.

- [ ] **Step 4: Run package verification**

Run: `npm pack --dry-run`

Expected: PASS and package contents include:

- `dist/console/index.html`
- `dist/console/app.js`
- `dist/console/styles.css`

- [ ] **Step 5: Start the console and smoke-test the landing page**

Run: `node dist/cli.js console --port 4319`

Expected: prints `ReleaseGuard Local Console: http://127.0.0.1:4319`

Then open `http://127.0.0.1:4319/` and confirm:

- the decision header shows a summary sentence
- the top finding feels visually prioritized
- the detail pane looks like the primary workspace
- the run panel remains secondary until invoked

- [ ] **Step 6: Commit**

```bash
git add src tests dist
git commit -m "feat(console): polish review desk presentation"
```

## Spec Coverage Check

- Decision-surface opening state: covered by Task 1 and Task 2.
- Priority-first default triage: covered by Task 1 and Task 3.
- Stronger review workspace detail pane: covered by Task 4.
- Secondary-but-available local-run controls: covered by Task 5.
- Screenshot-worthy but quiet developer-tool styling: covered by Tasks 2 through 5.

## Self-Review Notes

- The plan stays inside the browser layer plus tiny helper logic.
- No new backend or API work is introduced.
- The task split preserves TDD where behavior changes are real and avoids fake complexity where the shell already exists.
