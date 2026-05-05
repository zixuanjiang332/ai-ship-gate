import { describe, expect, it } from "vitest";
import type { GateContext } from "../../src/domain/types.js";
import { envRiskRule } from "../../src/rules/env.js";

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

describe("envRiskRule", () => {
  it("warns when env usage is added without an env example update", () => {
    const findings = envRiskRule.run(
      context([{ path: "src/config.ts", status: "modified", patch: "+const key = process.env.OPENAI_API_KEY;" }]),
    );
    expect(findings).toContainEqual(expect.objectContaining({ id: "env.example-not-updated", severity: "warn" }));
  });

  it("fails committed env files and secret-like values", () => {
    const findings = envRiskRule.run(
      context([
        { path: ".env", status: "added", patch: "+TOKEN=abc" },
        { path: "src/config.ts", status: "modified", patch: "+const token = \"sk-1234567890abcdef1234567890abcdef\";" },
      ]),
    );

    expect(findings).toContainEqual(expect.objectContaining({ id: "env.secret-file-committed", severity: "fail" }));
    expect(findings).toContainEqual(expect.objectContaining({ id: "env.secret-like-value", severity: "fail" }));
  });
});
