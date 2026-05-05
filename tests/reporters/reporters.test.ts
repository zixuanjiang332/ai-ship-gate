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
