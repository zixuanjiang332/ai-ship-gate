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

  it("keeps the top finding first in the priority queue", () => {
    const indexes = getPriorityFindingIndexes(baseResult);
    expect(baseResult.findings[indexes[0]]?.severity).toBe("fail");
  });
});
