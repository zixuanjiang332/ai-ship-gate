import { describe, expect, it } from "vitest";
import type { GateReport } from "../../src/domain/types.js";
import { renderSarif } from "../../src/reporters/sarif.js";

describe("SARIF reporter", () => {
  it("renders ReleaseGuard findings as SARIF 2.1.0 results", () => {
    const report: GateReport = {
      verdict: "fail",
      findings: [
        {
          id: "security.secret-in-diff",
          severity: "fail",
          title: "Secret-like value in diff",
          message: "The diff contains a token-like value.",
          files: ["src/config.ts", "apps\\api\\src\\auth.ts"],
          suggestion: "Remove the value and rotate it before shipping.",
        },
        {
          id: "tests.missing-related-tests",
          severity: "warn",
          title: "Source changed without tests",
          message: "Source changed but tests did not.",
          files: ["src/app.ts"],
          suggestion: "Add tests for the changed behavior.",
        },
        {
          id: "deploy.config-changed",
          severity: "info",
          title: "Deploy config changed",
          message: "Deployment configuration changed.",
          files: [],
          suggestion: "Review deployment notes.",
        },
      ],
    };

    const sarif = JSON.parse(renderSarif(report));
    const run = sarif.runs[0];

    expect(sarif.version).toBe("2.1.0");
    expect(sarif.$schema).toBe("https://docs.oasis-open.org/sarif/sarif/v2.1.0/os/schemas/sarif-schema-2.1.0.json");
    expect(run.tool.driver.name).toBe("ReleaseGuard AI");
    expect(run.tool.driver.informationUri).toBe("https://github.com/zixuanjiang332/releaseguard-ai");
    expect(run.tool.driver.rules.map((rule: { id: string }) => rule.id)).toEqual([
      "security.secret-in-diff",
      "tests.missing-related-tests",
      "deploy.config-changed",
    ]);
    expect(run.results.map((result: { level: string }) => result.level)).toEqual(["error", "warning", "note"]);

    expect(run.results[0]).toMatchObject({
      ruleId: "security.secret-in-diff",
      message: {
        text: "Secret-like value in diff: The diff contains a token-like value. Suggestion: Remove the value and rotate it before shipping.",
      },
      locations: [
        { physicalLocation: { artifactLocation: { uri: "src/config.ts" } } },
        { physicalLocation: { artifactLocation: { uri: "apps/api/src/auth.ts" } } },
      ],
    });
  });

  it("renders an empty SARIF result set for PASS reports", () => {
    const sarif = JSON.parse(renderSarif({ verdict: "pass", findings: [] }));

    expect(sarif.version).toBe("2.1.0");
    expect(sarif.runs[0].tool.driver.rules).toEqual([]);
    expect(sarif.runs[0].results).toEqual([]);
  });
});
