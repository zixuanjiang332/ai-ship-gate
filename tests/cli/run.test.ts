import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { parseOutputFormat } from "../../src/cli.js";
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
    expect(result.context).toEqual(context);
    expect(result.exitCode).toBe(0);
    expect(write).toHaveBeenCalledWith(expect.stringContaining("# ReleaseGuard AI: WARN"));
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

  it("loads config from the collected repo root", async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), "releaseguard-root-config-"));
    const cwd = join(repoRoot, "packages", "app");
    await mkdir(cwd, { recursive: true });
    await writeFile(join(repoRoot, "releaseguard.config.yaml"), "failOn: warn\n");

    const collectContext = vi.fn().mockResolvedValue({
      ...context,
      repoRoot,
    });

    const result = await runCheck({
      cwd,
      format: "json",
      ai: false,
      collectContext,
      write: vi.fn(),
    });

    expect(result.report.verdict).toBe("warn");
    expect(result.exitCode).toBe(1);
  });

  it("does not run disabled checks", async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), "releaseguard-disabled-check-"));
    await writeFile(join(repoRoot, "releaseguard.config.yaml"), "checks:\n  tests: false\n");

    const collectContext = vi.fn().mockResolvedValue({
      ...context,
      repoRoot,
    });

    const result = await runCheck({
      cwd: repoRoot,
      format: "json",
      ai: false,
      collectContext,
      write: vi.fn(),
    });

    expect(result.report.verdict).toBe("pass");
    expect(result.report.findings).toEqual([]);
  });
});

describe("parseOutputFormat", () => {
  it("accepts supported output formats", () => {
    expect(parseOutputFormat("terminal")).toBe("terminal");
    expect(parseOutputFormat("json")).toBe("json");
    expect(parseOutputFormat("markdown")).toBe("markdown");
    expect(parseOutputFormat("sarif")).toBe("sarif");
  });

  it("rejects unsupported output formats", () => {
    expect(() => parseOutputFormat("foo")).toThrow("Invalid format");
  });
});
