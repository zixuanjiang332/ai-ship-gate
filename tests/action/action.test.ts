import { cp, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parse } from "yaml";
import { isDirectRun, runAction } from "../../src/action.js";

let dir: string;
let summaryPath: string;
const execFileAsync = promisify(execFile);

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "shipgate-action-"));
  summaryPath = join(dir, "summary.md");
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("runAction", () => {
  it("writes the rendered report to the GitHub step summary", async () => {
    const runCheck = vi.fn().mockResolvedValue({
      report: { verdict: "warn", findings: [] },
      rendered: "# AI Ship Gate: WARN\n",
      exitCode: 0,
    });

    const exitCode = await runAction({
      env: {
        GITHUB_WORKSPACE: dir,
        GITHUB_STEP_SUMMARY: summaryPath,
        INPUT_BASE: "origin/main",
        INPUT_AI: "false",
      },
      runCheck,
    });

    await expect(readFile(summaryPath, "utf8")).resolves.toContain("# AI Ship Gate: WARN");
    expect(exitCode).toBe(0);
    expect(runCheck).toHaveBeenCalledWith(
      expect.objectContaining({
        cwd: dir,
        base: "origin/main",
        format: "markdown",
        ai: false,
      }),
    );
  });

  it.each([
    ["true", true],
    [" TRUE ", true],
    ["false", false],
    [undefined, false],
  ])("parses INPUT_AI=%s as %s", async (inputAi, expected) => {
    const runCheck = vi.fn().mockResolvedValue({
      report: { verdict: "pass", findings: [] },
      rendered: "# AI Ship Gate: PASS\n",
      exitCode: 0,
    });

    await runAction({
      env: {
        GITHUB_WORKSPACE: dir,
        INPUT_AI: inputAi,
      },
      runCheck,
    });

    expect(runCheck).toHaveBeenCalledWith(
      expect.objectContaining({
        ai: expected,
      }),
    );
  });

  it("returns the exit code without writing when no GitHub step summary is configured", async () => {
    const runCheck = vi.fn().mockResolvedValue({
      report: { verdict: "fail", findings: [] },
      rendered: "# AI Ship Gate: FAIL\n",
      exitCode: 1,
    });

    const exitCode = await runAction({
      env: {
        GITHUB_WORKSPACE: dir,
      },
      runCheck,
    });

    await expect(stat(summaryPath)).rejects.toMatchObject({ code: "ENOENT" });
    expect(exitCode).toBe(1);
  });

  it("defaults the GitHub Action base to origin/main for checkout-based CI", async () => {
    const action = parse(await readFile("action.yml", "utf8"));

    expect(action.inputs.base.default).toBe("origin/main");
  });
});

describe("isDirectRun", () => {
  it("returns false when GitHub Actions imports the module instead of invoking it", () => {
    const actionPath = join(dir, "dist", "action.js");
    expect(isDirectRun(["node", join(dir, "other.js")], pathToFileURL(actionPath).href)).toBe(false);
  });

  it("returns true when the action module is invoked as the node entrypoint", () => {
    const actionPath = join(dir, "dist", "action.js");
    expect(isDirectRun(["node", actionPath], pathToFileURL(actionPath).href)).toBe(true);
  });
});

describe("release action runtime", () => {
  it("runs from a release directory without node_modules", async () => {
    const releaseDir = await mkdtemp(join(tmpdir(), "shipgate-release-"));
    const workspaceDir = await mkdtemp(join(tmpdir(), "shipgate-workspace-"));
    const releaseSummaryPath = join(releaseDir, "summary.md");

    try {
      await cp("dist", join(releaseDir, "dist"), { recursive: true });
      await writeFile(join(releaseDir, "package.json"), JSON.stringify({ type: "module" }));

      await execFileAsync("git", ["init"], { cwd: workspaceDir });
      await writeFile(join(workspaceDir, "README.md"), "# Fixture\n");
      await execFileAsync("git", ["add", "README.md"], { cwd: workspaceDir });
      await execFileAsync(
        "git",
        ["-c", "user.name=Test", "-c", "user.email=test@example.com", "commit", "-m", "fixture"],
        { cwd: workspaceDir },
      );

      const result = await execFileAsync("node", [join(releaseDir, "dist", "action.js")], {
        cwd: releaseDir,
        env: {
          ...process.env,
          GITHUB_WORKSPACE: workspaceDir,
          GITHUB_STEP_SUMMARY: releaseSummaryPath,
          INPUT_BASE: "HEAD",
          INPUT_AI: "false",
        },
      });

      expect(result.stderr).not.toContain("ERR_MODULE_NOT_FOUND");
      await expect(readFile(releaseSummaryPath, "utf8")).resolves.toContain("# AI Ship Gate: PASS");
    } finally {
      await rm(releaseDir, { recursive: true, force: true });
      await rm(workspaceDir, { recursive: true, force: true });
    }
  });
});
