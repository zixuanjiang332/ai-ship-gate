import { describe, expect, it } from "vitest";
import type { GateContext } from "../../src/domain/types.js";
import { securityRiskRule } from "../../src/rules/security.js";

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

describe("securityRiskRule", () => {
  it("warns on security-sensitive changed areas", () => {
    const findings = securityRiskRule.run(
      context([{ path: "src/auth/session.ts", status: "modified", patch: "+export function login() {}" }]),
    );
    expect(findings).toContainEqual(expect.objectContaining({ id: "security.sensitive-area-changed", severity: "warn" }));
  });

  it("fails obvious secrets in patches", () => {
    const findings = securityRiskRule.run(
      context([{ path: "src/config.ts", status: "modified", patch: "+token = \"sk-1234567890abcdef1234567890abcdef\"" }]),
    );
    expect(findings).toContainEqual(expect.objectContaining({ id: "security.secret-in-diff", severity: "fail" }));
  });
});
