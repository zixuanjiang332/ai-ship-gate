import { describe, expect, it } from "vitest";
import type { GateContext } from "../../src/domain/types.js";
import { ciRiskRule, dockerRiskRule } from "../../src/rules/ciDeploy.js";

const context = (changedFiles: GateContext["changedFiles"]): GateContext => ({
  repoRoot: "/repo",
  baseRef: "main",
  changedFiles,
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
    hasDockerfile: true,
    hasCompose: false,
    hasGitHubActions: true,
    hasEnvExample: false,
  },
});

describe("ci and docker risk rules", () => {
  it("warns when deployment files change", () => {
    const findings = ciRiskRule.run(
      context([{ path: ".github/workflows/deploy.yml", status: "modified", patch: "+run: npm run deploy" }]),
    );
    expect(findings).toContainEqual(expect.objectContaining({ id: "deploy.config-changed", severity: "warn" }));
  });

  it("warns when Dockerfile lacks healthcheck", () => {
    const findings = dockerRiskRule.run(context([{ path: "Dockerfile", status: "modified", patch: "+FROM node:20\n+CMD npm start" }]));
    expect(findings).toContainEqual(
      expect.objectContaining({ id: "deploy.dockerfile-healthcheck-missing", severity: "warn" }),
    );
  });
});
