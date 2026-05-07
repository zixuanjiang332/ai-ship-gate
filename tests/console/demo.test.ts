import { describe, expect, it } from "vitest";
import { consoleDemoResult } from "../../src/console/demo.js";

describe("consoleDemoResult", () => {
  it("ships a polished demo report for the first dashboard view", () => {
    expect(consoleDemoResult.source).toBe("demo");
    expect(consoleDemoResult.verdict).toBe("fail");
    expect(consoleDemoResult.findingsCount).toBeGreaterThanOrEqual(4);
    expect(consoleDemoResult.findings.length).toBeGreaterThanOrEqual(3);
    expect(consoleDemoResult.affectedFilesCount).toBeGreaterThanOrEqual(3);
    expect(consoleDemoResult.findings[0]?.id).toBe("security.secret-in-diff");
    expect(consoleDemoResult.findings.some((finding) => finding.id === "security.secret-in-diff")).toBe(true);
    expect(consoleDemoResult.findings.some((finding) => finding.id === "tests.missing-related-tests")).toBe(true);
  });

  it("keeps counts and affected files aligned with the findings list", () => {
    const severityTotals = consoleDemoResult.findings.reduce(
      (summary, finding) => {
        summary[finding.severity] += 1;
        return summary;
      },
      { fail: 0, warn: 0, info: 0 },
    );
    const affectedFiles = new Set(consoleDemoResult.findings.flatMap((finding) => finding.files));

    expect(consoleDemoResult.findingsCount).toBe(consoleDemoResult.findings.length);
    expect(consoleDemoResult.counts).toEqual(severityTotals);
    expect(consoleDemoResult.affectedFilesCount).toBe(affectedFiles.size);
    expect(consoleDemoResult.files).toHaveLength(affectedFiles.size);
    expect(consoleDemoResult.files.every((file) => file.matchedFindingIds.length > 0)).toBe(true);
  });
});
