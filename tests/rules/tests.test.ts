import { describe, expect, it } from "vitest";
import type { GateContext } from "../../src/domain/types.js";
import { runRules } from "../../src/rules/engine.js";
import { testRiskRule } from "../../src/rules/tests.js";

const context = (changedFiles: GateContext["changedFiles"]): GateContext => ({
  repoRoot: "/repo",
  baseRef: "main",
  changedFiles,
  metadata: {
    hasPackageJson: false,
    hasPackageLock: false,
    hasPnpmLock: false,
    hasYarnLock: false,
    hasPyproject: false,
    hasRequirements: false,
    hasGoMod: false,
    hasCargoToml: false,
    hasPomXml: false,
    hasDockerfile: false,
    hasCompose: false,
    hasGitHubActions: false,
    hasEnvExample: false,
  },
});

describe("testRiskRule", () => {
  it("warns when source changes do not include test changes", () => {
    const findings = testRiskRule.run(
      context([{ path: "src/auth.ts", status: "modified", patch: "+export const ok = true;" }]),
    );

    expect(findings).toContainEqual(
      expect.objectContaining({
        id: "tests.missing-related-tests",
        severity: "warn",
      }),
    );
  });

  it("does not warn when tests change with source", () => {
    const findings = testRiskRule.run(
      context([
        { path: "src/auth.ts", status: "modified", patch: "+export const ok = true;" },
        { path: "src/auth.test.ts", status: "modified", patch: "+it('works', () => {})" },
      ]),
    );

    expect(findings.some((finding) => finding.id === "tests.missing-related-tests")).toBe(false);
  });

  it("fails focused tests and warns skipped tests", () => {
    const findings = testRiskRule.run(
      context([
        { path: "src/auth.test.ts", status: "modified", patch: "+it.only('works', () => {})" },
        { path: "src/payment.test.ts", status: "modified", patch: "+describe.skip('slow', () => {})" },
      ]),
    );

    expect(findings).toContainEqual(expect.objectContaining({ id: "tests.focused-test", severity: "fail" }));
    expect(findings).toContainEqual(expect.objectContaining({ id: "tests.skipped-test", severity: "warn" }));
  });
});

describe("runRules", () => {
  it("runs enabled rules", () => {
    const findings = runRules(context([{ path: "src/app.ts", status: "modified", patch: "+x" }]), [testRiskRule]);
    expect(findings.map((finding) => finding.id)).toContain("tests.missing-related-tests");
  });
});
