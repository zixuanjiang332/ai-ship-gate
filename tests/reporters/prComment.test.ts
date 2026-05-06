import { describe, expect, it } from "vitest";
import { renderPrComment, releaseGuardCommentMarker } from "../../src/reporters/prComment.js";

describe("PR comment reporter", () => {
  it("renders a stable marker with verdict counts and top findings", () => {
    const body = renderPrComment({
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
    });

    expect(body).toContain(releaseGuardCommentMarker);
    expect(body).toContain("## ReleaseGuard AI: FAIL");
    expect(body).toContain("| FAIL | 2 | 1 | 1 | 0 |");
    expect(body).toContain("`security.secret-in-diff`");
    expect(body).toContain("Review the secret first.");
  });

  it("renders a compact pass comment when no risks are found", () => {
    const body = renderPrComment({ verdict: "pass", findings: [] });

    expect(body).toContain("## ReleaseGuard AI: PASS");
    expect(body).toContain("| PASS | 0 | 0 | 0 | 0 |");
    expect(body).toContain("No release risks detected.");
    expect(body).not.toContain("## Top Findings");
  });
});
