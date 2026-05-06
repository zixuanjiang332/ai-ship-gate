import { describe, expect, it } from "vitest";
import type { GateReport } from "../../src/domain/types.js";
import { renderActionSummary, summarizeFindings } from "../../src/reporters/actionSummary.js";

describe("action summary reporter", () => {
  it("summarizes findings by severity", () => {
    const report: GateReport = {
      verdict: "fail",
      findings: [
        finding("fail", "security.secret-in-diff"),
        finding("warn", "tests.missing-related-tests"),
        finding("info", "deploy.config-changed"),
      ],
    };

    expect(summarizeFindings(report)).toEqual({
      findingsCount: 3,
      failCount: 1,
      warnCount: 1,
      infoCount: 1,
    });
  });

  it("renders a GitHub-friendly summary with counts and top findings", () => {
    const report: GateReport = {
      verdict: "fail",
      findings: [
        {
          id: "security.secret-in-diff",
          severity: "fail",
          title: "Secret-like value in diff",
          message: "The diff contains a token-like value.",
          files: ["src/config.ts", ".env.example"],
          suggestion: "Remove the value and rotate it before shipping.",
        },
        {
          id: "tests.missing-related-tests",
          severity: "warn",
          title: "Source changed without tests",
          message: "Source changed but tests did not.",
          files: ["src/auth.ts"],
          suggestion: "Add tests for the changed behavior.",
        },
      ],
      aiSummary: "Review the secret first.",
    };

    const summary = renderActionSummary(report);

    expect(summary).toContain("# ReleaseGuard AI: FAIL");
    expect(summary).toContain("| Verdict | Findings | Fail | Warn | Info |");
    expect(summary).toContain("| FAIL | 2 | 1 | 1 | 0 |");
    expect(summary).toContain("## Top Findings");
    expect(summary).toContain("| FAIL | `security.secret-in-diff` | `src/config.ts`, `.env.example` | Remove the value and rotate it before shipping. |");
    expect(summary).toContain("| WARN | `tests.missing-related-tests` | `src/auth.ts` | Add tests for the changed behavior. |");
    expect(summary).toContain("## AI Summary");
    expect(summary).toContain("Review the secret first.");
  });

  it("renders a compact pass summary when no risks are found", () => {
    const summary = renderActionSummary({ verdict: "pass", findings: [] });

    expect(summary).toContain("# ReleaseGuard AI: PASS");
    expect(summary).toContain("| PASS | 0 | 0 | 0 | 0 |");
    expect(summary).toContain("No release risks detected.");
    expect(summary).not.toContain("## Top Findings");
  });
});

function finding(severity: "info" | "warn" | "fail", id: string) {
  return {
    id,
    severity,
    title: id,
    message: id,
    files: ["src/app.ts"],
    suggestion: id,
  };
}
