import { describe, expect, it } from "vitest";
import type { Finding } from "../../src/domain/types.js";
import {
  renderReviewComment,
  reviewCommentMarkerPrefix,
} from "../../src/reporters/reviewComment.js";

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
    expect(body).toContain(
      `${reviewCommentMarkerPrefix} rule=tests.missing-related-tests file=src/auth.ts anchor=17 -->`,
    );
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
    expect(body).toContain("\\[links\\]\\(https://example.com\\)");
    expect(body).toContain("\\`ticks\\`");
  });
});
