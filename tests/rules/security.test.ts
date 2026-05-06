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

  it("does not add a separate security warning for ordinary workflow file changes", () => {
    const findings = securityRiskRule.run(
      context([
        {
          path: ".github/workflows/releaseguard.yml",
          status: "modified",
          patch: "+jobs:\n+  verify:\n+    runs-on: ubuntu-latest\n+    steps:\n+      - run: echo ok",
        },
      ]),
    );

    expect(findings.some((finding) => finding.id === "security.sensitive-area-changed")).toBe(false);
  });

  it("does not warn for a standard PR comment workflow that uses github.token", () => {
    const findings = securityRiskRule.run(
      context([
        {
          path: ".github/workflows/releaseguard.yml",
          status: "modified",
          patch:
            "+on:\n+  pull_request:\n+jobs:\n+  smoke:\n+    permissions:\n+      contents: read\n+      pull-requests: write\n+    steps:\n+      - env:\n+          GITHUB_TOKEN: ${{ github.token }}",
        },
      ]),
    );

    expect(findings.some((finding) => finding.id === "security.sensitive-area-changed")).toBe(false);
  });

  it("warns when a workflow introduces elevated security-sensitive capabilities", () => {
    const findings = securityRiskRule.run(
      context([
        {
          path: ".github/workflows/releaseguard.yml",
          status: "modified",
          patch: "+on:\n+  pull_request_target:\n+permissions:\n+  id-token: write\n+  contents: write",
        },
      ]),
    );

    expect(findings).toContainEqual(expect.objectContaining({ id: "security.sensitive-area-changed", severity: "warn" }));
  });
});
