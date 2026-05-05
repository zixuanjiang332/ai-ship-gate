import { describe, expect, it } from "vitest";
import type { GateContext } from "../../src/domain/types.js";
import { envRiskRule } from "../../src/rules/env.js";

const context = (
  changedFiles: GateContext["changedFiles"],
  metadata: Partial<GateContext["metadata"]> = {},
): GateContext => ({
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
    ...metadata,
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

  it("does not warn when env usage is added with an env example update", () => {
    const findings = envRiskRule.run(
      context([
        { path: "src/config.ts", status: "modified", patch: "+const key = process.env.OPENAI_API_KEY;" },
        { path: ".env.example", status: "modified", patch: "+OPENAI_API_KEY=" },
      ]),
    );

    expect(findings.some((finding) => finding.id === "env.example-not-updated")).toBe(false);
  });

  it("does not warn when env usage is added with docs or README updates", () => {
    const findings = envRiskRule.run(
      context([
        { path: "src/config.ts", status: "modified", patch: "+const key = process.env.OPENAI_API_KEY;" },
        { path: "docs/setup.md", status: "modified", patch: "+Set OPENAI_API_KEY." },
        { path: "README.md", status: "modified", patch: "+Set OPENAI_API_KEY." },
      ]),
    );

    expect(findings.some((finding) => finding.id === "env.example-not-updated")).toBe(false);
  });

  it("does not warn when repo metadata reports an env example exists", () => {
    const findings = envRiskRule.run(
      context([{ path: "src/config.ts", status: "modified", patch: "+const key = process.env.OPENAI_API_KEY;" }], {
        hasEnvExample: true,
      }),
    );

    expect(findings.some((finding) => finding.id === "env.example-not-updated")).toBe(false);
  });

  it("fails nested real env files but not nested env examples", () => {
    const findings = envRiskRule.run(
      context([
        { path: "apps/api/.env", status: "added", patch: "+TOKEN=abc" },
        { path: "config/.env.production", status: "added", patch: "+TOKEN=abc" },
        { path: "config/.env.example", status: "added", patch: "+TOKEN=" },
        { path: "config/.env.sample", status: "added", patch: "+TOKEN=" },
      ]),
    );

    expect(findings).toContainEqual(
      expect.objectContaining({
        id: "env.secret-file-committed",
        files: ["apps/api/.env", "config/.env.production"],
        severity: "fail",
      }),
    );
  });
});
