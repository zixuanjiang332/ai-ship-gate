import { describe, expect, it, vi } from "vitest";
import type { GateContext } from "../../src/domain/types.js";
import { runCheck } from "../../src/run.js";

const context: GateContext = {
  repoRoot: "/repo",
  baseRef: "main",
  changedFiles: [{ path: "src/app.ts", status: "modified", patch: "+export const ok = true;" }],
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

describe("runCheck", () => {
  it("collects context, runs rules, renders output, and returns report", async () => {
    const collectContext = vi.fn().mockResolvedValue(context);
    const write = vi.fn();

    const result = await runCheck({
      cwd: "/repo",
      base: "main",
      format: "markdown",
      ai: false,
      collectContext,
      write,
    });

    expect(result.report.verdict).toBe("warn");
    expect(result.exitCode).toBe(0);
    expect(write).toHaveBeenCalledWith(expect.stringContaining("# AI Ship Gate: WARN"));
  });

  it("returns exit code 1 when failOn threshold is reached", async () => {
    const collectContext = vi.fn().mockResolvedValue({
      ...context,
      changedFiles: [{ path: ".env", status: "added", patch: "+TOKEN=abc" }],
    });

    const result = await runCheck({
      cwd: "/repo",
      format: "json",
      ai: false,
      collectContext,
      write: vi.fn(),
    });

    expect(result.report.verdict).toBe("fail");
    expect(result.exitCode).toBe(1);
  });
});
