import { describe, expect, it } from "vitest";
import type { GateReport } from "../../src/domain/types.js";
import { renderReport } from "../../src/reporters/index.js";
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

  it("escapes untrusted Markdown fields", () => {
    const markdown = renderMarkdown({
      verdict: "fail",
      findings: [
        {
          id: "rule`id\n# fake <script>",
          severity: "fail",
          title: "Bad `title`\n# fake <h1>",
          message: "Reason\r\n- fake <b>",
          files: ["src/evil`file\nname<bad>.ts"],
          suggestion: "Use `safe`\n# no <raw>",
        },
      ],
      aiSummary: "Summary `code`\n# fake <img>",
    });

    expect(markdown).toContain("Summary \\`code\\` # fake &lt;img&gt;");
    expect(markdown).toContain("### FAIL: Bad \\`title\\` # fake &lt;h1&gt;");
    expect(markdown).toContain("- Rule: rule\\`id # fake &lt;script&gt;");
    expect(markdown).toContain("- Files: src/evil\\`file name&lt;bad&gt;.ts");
    expect(markdown).toContain("- Reason: Reason - fake &lt;b&gt;");
    expect(markdown).toContain("- Suggestion: Use \\`safe\\` # no &lt;raw&gt;");
    expect(markdown).not.toContain("<script>");
    expect(markdown).not.toContain("<img>");
  });

  it("strips terminal control characters from untrusted fields", () => {
    const terminal = renderTerminal(
      {
        verdict: "fail",
        findings: [
          {
            id: "rule\u001b[31mid\u0007",
            severity: "fail",
            title: "Bad\u001b[2J title\r\nFAKE",
            message: "Reason\u001b]8;;https://example.com\u0007link\u001b]8;;\u0007\nnext",
            files: ["src/\u001b[31mevil.ts"],
            suggestion: "Suggest\u0000ion\r\nnext",
          },
        ],
        aiSummary: "Summary\u001b[31m red\r\nFAKE",
      },
      { color: false },
    );

    expect(terminal).toContain("Summary red FAKE");
    expect(terminal).toContain("[FAIL] Bad title FAKE");
    expect(terminal).toContain("Rule: ruleid");
    expect(terminal).toContain("Files: src/evil.ts");
    expect(terminal).toContain("Reason: Reasonlink next");
    expect(terminal).toContain("Suggestion: Suggestion next");
    expect(terminal).not.toContain("\u001b");
    expect(terminal).not.toContain("\u0007");
  });

  it("dispatches rendering by format", () => {
    expect(renderReport(report, "json")).toBe(renderJson(report));
    expect(renderReport(report, "markdown")).toBe(renderMarkdown(report));
    expect(renderReport(report, "terminal")).toBe(renderTerminal(report));
  });

  it("renders no-findings PASS output", () => {
    const passReport: GateReport = {
      verdict: "pass",
      findings: [],
    };

    expect(renderMarkdown(passReport)).toContain("# AI Ship Gate: PASS");
    expect(renderMarkdown(passReport)).toContain("No release risks detected.");
    expect(renderTerminal(passReport, { color: false })).toContain("AI Ship Gate: PASS");
    expect(renderTerminal(passReport, { color: false })).toContain("No release risks detected.");
  });
});
